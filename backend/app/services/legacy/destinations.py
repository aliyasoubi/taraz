"""Reading the old "bank-account" and notes columns.

A cell may name the account the money went to ("Blu – Ziba", "POS Tejarat", a
third party), the treating doctor, the person who paid, the payment method
(cheque, dollars), or just carry a note. Several can share a cell, separated by
commas. `Accounts` collapses the many spellings of one account into one entry.
"""

import re
from dataclasses import dataclass, field

from app.core.i18n import t
from app.models import AccountKind, PaymentMethod
from app.services.legacy.cells import ascii_digits, text_of
from app.services.workbook.model import AccountEntry
from app.utils.text import fold, tidy

_SPLIT = re.compile(r"[,\u060C]")


def _words(key: str) -> list[str]:
    return sorted((fold(w) for w in t(key)), key=len, reverse=True)


@dataclass
class Destination:
    account: str | None = None  # canonical account title
    account_raw: str | None = None
    _entry: AccountEntry | None = None
    doctor: str | None = None
    payer: str | None = None
    method: PaymentMethod | None = None
    notes: list[str] = field(default_factory=list)


@dataclass
class _Account:
    title: str
    kind: AccountKind
    bank: str | None
    owner: str | None


class Accounts:
    """Canonical accounts, built up while reading; the same spelling always maps the same way."""

    def __init__(self, doctors: set[str] | None = None) -> None:
        self._doctors = doctors or set()  # folded surnames seen after the word for "doctor"
        self._pool: dict[str, AccountEntry] = {}  # every account spelling seen, by identity key
        self._entries: dict[int, AccountEntry] = {}  # the ones a ledger line uses
        self._banks: list[tuple[str, str]] = sorted(
            ((fold(syn), bank) for bank, syns in t("legacy.banks").items() for syn in syns),
            key=lambda pair: len(pair[0]),
            reverse=True,
        )
        self._pos = _words("legacy.posWords")
        self._notes = _words("legacy.noteWords")
        self._doctor = fold(t("legacy.doctor"))
        self._misters = [fold(w) for w in t("legacy.mister")]
        self._cheque = fold(t("legacy.cheque"))
        self._dollar = fold(t("legacy.dollar"))
        self._paid_by = fold(t("legacy.paidBy"))
        self._to_account = fold(t("legacy.toAccount"))
        self._to_words = {fold(w) for w in t("legacy.toWords")}

    @property
    def entries(self) -> list[AccountEntry]:
        return sorted(self._entries.values(), key=lambda e: -e.uses)

    def learn_doctors(self, cells: list[object]) -> None:
        """First pass: "doctor X" anywhere makes a bare "X" elsewhere mean that doctor."""
        for cell in cells:
            for part in _SPLIT.split(text_of(cell)):
                self._doctor_name(fold(part))

    # ── Cells ────────────────────────────────────────────────────────────────

    def read(self, *cells: object) -> Destination:
        dest = Destination()
        for cell in cells:
            for part in _SPLIT.split(text_of(cell)):
                for piece in self._split_hyphen(tidy(part)):
                    self._read_part(piece, dest)
        return dest

    def _split_hyphen(self, part: str) -> list[str]:
        """'Emami-Tejarat Zahra' is a doctor and an account; 'B- Ziba' is one account."""
        pieces = [tidy(p) for p in part.split("-")]
        if len(pieces) == 2 and all(len(p) > 1 for p in pieces):
            for piece in pieces:
                key = fold(piece)
                bank, owner = self._bank_of(key)
                if self._doctor_name(key) or (bank and owner):
                    return pieces
        return [part]

    def _read_part(self, part: str, dest: Destination) -> None:
        key = fold(part)
        if not key:
            return
        if re.fullmatch(r"[\d.,\s]+", ascii_digits(part)):
            dest.notes.append(part)
            return
        if doctor := self._doctor_name(key):
            dest.doctor = dest.doctor or doctor
            return
        if key.startswith(self._paid_by):
            dest.payer = dest.payer or tidy(part[len(t("legacy.paidBy")) :]) or None
            return
        if key.startswith(self._cheque):
            dest.method = PaymentMethod.CHEQUE
            dest.payer = dest.payer or tidy(part[len(t("legacy.cheque")) :]) or None
            return
        if self._dollar in key:
            dest.method = PaymentMethod.CURRENCY
            dest.notes.append(part)
            return
        pos = any(self._is_pos_word(word) for word in key.split())
        if not pos and any(self._note_pattern(w).search(key) for w in self._notes):
            dest.notes.append(part)
            return
        if dest.account is not None:  # a second account in one cell stays a note
            dest.notes.append(part)
            return
        account = self._canonical(part, key, pos)
        dest.account, dest.account_raw = account.title, part
        dest._entry = self._entry_for(account)
        if pos:
            dest.method = dest.method or PaymentMethod.POS

    def _doctor_name(self, key: str) -> str | None:
        words = key.split()
        if words and words[0].startswith(self._doctor):
            rest = key[len(self._doctor) :].strip()
            if rest and not self._bank_of(rest)[0]:
                self._doctors.add(rest)
                return f"{t('legacy.doctor')} {rest}"
        if words and (words[0] in self._misters or len(words) == 1) and words[-1] in self._doctors:
            return f"{t('legacy.doctor')} {words[-1]}"
        return None

    # ── Canonical accounts ───────────────────────────────────────────────────

    def _bank_of(self, key: str) -> tuple[str | None, str]:
        for syn, bank in self._banks:
            if key == syn or key.startswith(syn + " "):
                return bank, key[len(syn) :].strip()
        return None, key

    def _canonical(self, part: str, key: str, pos: bool) -> _Account:
        # Match on folded words, but show the owner as it was written.
        words = self._strip_to_account(tidy(re.sub(r"\s*-\s*", " ", part))).split()
        words = [w for word in words for w in self._unglue_pos(word) if fold(w) not in self._pos]
        bank, rest = self._bank_of(fold(" ".join(words)))
        owner = " ".join(words[len(words) - len(rest.split()) :]) if rest else None
        if pos:
            title = t("legacy.posTitle", bank=bank) if bank else t("legacy.posTitleNoBank")
            return _Account(title, AccountKind.POS, bank, None)
        if bank and owner:
            title = t("legacy.accountTitle", bank=bank, owner=owner)
            return _Account(title, AccountKind.OWN, bank, owner)
        if bank:
            return _Account(bank, AccountKind.OWN, bank, None)
        person = " ".join(w for w in words if fold(w) not in self._misters) or tidy(part)
        # "The account of …" with no bank is still one of the practice's own accounts.
        kind = (
            AccountKind.OWN if fold(part).startswith(self._to_account) else AccountKind.THIRD_PARTY
        )
        return _Account(person, kind, None, person)

    @staticmethod
    def _note_pattern(word: str) -> re.Pattern[str]:
        """A note keyword at the start of a word; short ones must be the whole word
        (the two-letter word for "jaw" must not swallow a surname that starts with it)."""
        end = r"(?=\s|$)" if len(word) <= 2 else ""
        return re.compile(rf"(^|\s){re.escape(word)}{end}")

    def _is_pos_word(self, word: str) -> bool:
        """'pos', 'pis', the Persian words, or 'posSepah' glued — but not a word that merely
        starts with the Persian letters (e.g. "physician")."""
        return any(word == w or (w.isascii() and word.startswith(w)) for w in self._pos)

    def _unglue_pos(self, word: str) -> list[str]:
        """ "posSepah" → ["pos", "Sepah"]: the terminal word is often typed without a space."""
        key = fold(word)
        for pos in self._pos:
            if pos.isascii() and key.startswith(pos) and len(key) > len(pos):
                return [word[: len(pos)], word[len(pos) :]]
        return [word]

    def _strip_to_account(self, text: str) -> str:
        """Drops a leading "to the account of" ("to" as a word, then "account") from a cell."""
        words = text.split()
        if (
            len(words) > 2
            and fold(words[0]) in self._to_words
            and fold(words[1]) == self._to_account
        ):
            return " ".join(words[2:])
        return text

    def _entry_for(self, account: _Account) -> AccountEntry:
        key = fold(account.title).replace(" ", "")
        entry = self._pool.get(key)
        if entry is None:
            entry = AccountEntry(account.title, account.kind, account.bank, account.owner)
            self._pool[key] = entry
        return entry

    def use(self, dest: Destination) -> None:
        """Count an account once a ledger line actually sends money to it."""
        entry = dest._entry
        if entry is None or dest.account_raw is None:
            return
        entry.aliases.add(dest.account_raw)
        entry.uses += 1
        self._entries[id(entry)] = entry
