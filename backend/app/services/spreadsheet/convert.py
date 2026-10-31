"""The practice's workbook → `StandardBook`.

Each month sheet has one row per visit or payment: patient, service,
balance after the row, payment, date, the account it went to, notes. Columns
are found by their headers, so an added "payer" or "doctor" column is read too.

Per patient and treatment case, rows are replayed in date order against a
running balance:

* a payment becomes a payment line (who paid → which account);
* when the recorded balance is higher than expected, the difference is the
  treatment that was done — a charge line, named after the service;
* when it is lower without a payment, an adjustment (discount) line, flagged;
* an item or visit fee (toothbrush, visit) is a charge settled by the same
  payment and leaves the balance alone; a deposit leaves the patient in credit;
* an implant (or laminate, orthodontics) keeps its own balance, as the sheet does.

The debtors list, the practice's own receivables on `as_of`, is taken as the
truth on that day: each listed patient's balance is aligned to it and its
cheques are added as pending cheques. Rows after `as_of` replay on top.
"""

from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import date
from itertools import combinations
from pathlib import Path
from typing import Any

from openpyxl import load_workbook
from openpyxl.worksheet.worksheet import Worksheet

from app.core.i18n import t
from app.models import ChequeStatus, PaymentMethod, TreatmentKind, TxType
from app.services.spreadsheet.cells import (
    Amount,
    PatientName,
    edit_distance,
    parse_amount,
    parse_date,
    parse_name,
    service_case,
    text_of,
)
from app.services.spreadsheet.destinations import Accounts, Destination
from app.services.workbook.model import Issue, Line, PatientEntry, StandardBook
from app.utils.jalali import JMonth
from app.utils.text import fold, tidy

CaseKey = tuple[str, TreatmentKind | None]

# Where each column sits when a sheet's header does not say.
_DEFAULT_COLUMNS = {
    "name": 0,
    "service": 1,
    "balance": 2,
    "payment": 3,
    "date": 4,
    "account": 5,
    "notes": 6,
}


@dataclass
class _Row:
    source: str
    order: tuple[int, int]
    name: PatientName
    on: date
    service: str
    balance: Amount
    payment: Amount
    dest: Destination
    doctor: str | None
    payer: str | None
    date_problem: str | None


@dataclass
class _Debt:
    source: str
    name: PatientName
    amount: int
    cheque: bool
    due: date | None
    payer: str | None
    note: str | None


@dataclass
class _Case:
    balance: int = 0
    seen: bool = False


def _columns(ws: Worksheet) -> dict[str, int]:
    """Field → column index, from the header row; unknown headers keep the default layout."""
    header = next(ws.iter_rows(min_row=1, max_row=1, values_only=True), ())
    found: dict[str, int] = {}
    for index, cell in enumerate(header):
        text = fold(text_of(cell))
        if not text:
            continue
        for field_name, words in t("spreadsheet.headers").items():
            if field_name not in found and any(text == fold(w) for w in words):
                found[field_name] = index
    return {**_DEFAULT_COLUMNS, **found}


@dataclass
class _Converter:
    as_of: date
    # Treat the debtors list as complete: anyone not on it is settled at `as_of`.
    settle_unlisted: bool = False
    accounts: Accounts = field(default_factory=Accounts)
    rows: list[_Row] = field(default_factory=list)
    debts: list[_Debt] = field(default_factory=list)
    book: StandardBook = field(default_factory=StandardBook)
    names: dict[str, Counter[str]] = field(default_factory=lambda: defaultdict(Counter))
    cases: dict[CaseKey, _Case] = field(default_factory=lambda: defaultdict(_Case))

    # ── Reading ──────────────────────────────────────────────────────────────

    def issue(self, source: str, patient: str, text: str) -> str:
        self.book.issues.append(Issue(source, patient, text))
        return text

    def read(self, path: Path) -> None:
        wb = load_workbook(path, data_only=True, read_only=True)
        sheets = {ws.title: ws for ws in wb.worksheets}
        # Doctors are learnt from every text cell first, so "Emami" alone is known to be one.
        self.accounts.learn_doctors(
            cell
            for ws in wb.worksheets
            for row in ws.iter_rows(min_row=2, values_only=True)
            for cell in row[1:]
        )

        month_sheets = [ws for ws in wb.worksheets if ws.title in t("spreadsheet.monthSheets")]
        dated = [(month, ws) for ws in month_sheets if (month := self._sheet_month(ws))]
        # By month only: two sheets of the same month must not be compared as worksheets.
        months = sorted(dated, key=lambda pair: pair[0])
        for index, (month, ws) in enumerate(months):
            self._read_rows(ws, index, month)
        if ortho := sheets.get(t("spreadsheet.orthoSheet")):
            self._read_rows(ortho, len(months), None, case=TreatmentKind.ORTHO)
        if debtors := sheets.get(t("spreadsheet.debtorsSheet")):
            self._read_debtors(debtors)

    @staticmethod
    def _sheet_month(ws: Worksheet) -> tuple[int, int] | None:
        date_col = _columns(ws)["date"]
        found: Counter[tuple[int, int]] = Counter()
        for row in ws.iter_rows(min_row=2, values_only=True):
            parsed = parse_date(row[date_col] if len(row) > date_col else None, None, None)
            if parsed.on and not parsed.problem:
                m = JMonth.of(parsed.on)
                found[(m.year, m.month)] += 1
        return found.most_common(1)[0][0] if found else None

    def _read_rows(
        self,
        ws: Worksheet,
        sheet_index: int,
        month: tuple[int, int] | None,
        case: TreatmentKind | None = None,
    ) -> None:
        cols = _columns(ws)
        previous: date | None = None
        for line, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            cells = [*row, *([None] * 12)]

            cell = {field_name: cells[index] for field_name, index in cols.items()}
            name = parse_name(cell.get("name"))
            if name is None:
                continue
            service = tidy(text_of(cell.get("service")))
            kind = name.case or service_case(service) or case
            name = PatientName(name.display, name.key, kind)
            source = f"{ws.title}!{line}"
            parsed = parse_date(cell.get("date"), month, previous)
            if parsed.on is None:
                self.issue(source, name.display, t("spreadsheet.issues.skippedRow"))
                continue
            previous = parsed.on
            dest = self.accounts.read(cell.get("account"), cell.get("notes"))
            self.names[name.key][name.display] += 1
            self.rows.append(
                _Row(
                    source=source,
                    order=(sheet_index, line),
                    name=name,
                    on=parsed.on,
                    service=service,
                    balance=parse_amount(cell.get("balance")),
                    payment=parse_amount(cell.get("payment")),
                    dest=dest,
                    doctor=tidy(text_of(cell.get("doctor"))) or dest.doctor,
                    payer=tidy(text_of(cell.get("payer"))) or dest.payer,
                    date_problem=parsed.problem,
                )
            )

    def _read_debtors(self, ws: Worksheet) -> None:
        cheque_word = fold(t("spreadsheet.cheque"))
        for line, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            name_cell, amount_cell, date_cell, bank_cell, note_cell = [*row, *([None] * 5)][:5]
            name = parse_name(name_cell)
            if name is None:
                continue
            source = f"{ws.title}!{line}"
            amount = parse_amount(amount_cell)
            if amount.value is None:
                self.issue(
                    source, name.display, t("spreadsheet.issues.unknownBalance", raw=amount.raw)
                )
                continue
            date_text, bank_text = text_of(date_cell), text_of(bank_cell)
            # "Implant" written beside the amount: this debt is the implant case's.
            kind = name.case or service_case(f"{date_text} {text_of(note_cell)}")
            name = PatientName(name.display, name.key, kind)
            due = (
                parse_date(date_cell, None, None).on
                if any(c.isdigit() for c in date_text)
                else None
            )
            cheque = fold(bank_text).startswith(cheque_word) or fold(date_text) == cheque_word
            payer = (
                bank_text[len(t("spreadsheet.cheque")) :].strip()
                if fold(bank_text).startswith(cheque_word)
                else None
            )
            note = " — ".join(
                x
                for x in (
                    date_text if due is None and not cheque and kind is None else "",
                    bank_text if not cheque else "",
                    text_of(note_cell),
                )
                if x
            )
            self.names[name.key][name.display] += 1
            self.debts.append(
                _Debt(source, name, amount.value, cheque, due, payer or None, note or None)
            )

    # ── Replaying the ledger ─────────────────────────────────────────────────

    def _line(self, name: PatientName, **fields: Any) -> Line:
        line = Line(patient=name.key, case=name.case, **fields)
        self.book.lines.append(line)
        return line

    def replay(self) -> None:
        aligned = False
        for row in sorted(self.rows, key=lambda r: (r.on, r.order)):
            if not aligned and row.on > self.as_of:
                self.apply_debtors()
                aligned = True
            self._replay(row)
        if not aligned:
            self.apply_debtors()

    def _replay(self, row: _Row) -> None:
        name, dest = row.name, row.dest
        cheque_word = fold(t("spreadsheet.cheque"))
        balance_text = fold(row.balance.text or "")
        payment_text = fold(row.payment.text or "")
        # What the row was for: the service column, or (older rows) words in the balance cell.
        about = f"{fold(row.service)} {balance_text}"

        if dest.method == PaymentMethod.CHEQUE and not row.payment.value and row.balance.value:
            self.issue(row.source, name.display, t("spreadsheet.issues.chequeSchedule"))
            return
        if balance_text.startswith(cheque_word) and row.payment.value is None:
            self.issue(row.source, name.display, t("spreadsheet.issues.skippedRow"))
            return
        if row.balance.value is None and row.payment.value is None and not row.balance.text:
            return

        state = self.cases[(name.key, name.case)]
        state.seen = True
        paid = row.payment.value or 0
        deposit = fold(t("spreadsheet.deposit")) in about
        sold = (
            bool(paid)
            and not deposit
            and any(fold(w) in about for w in t("spreadsheet.salesWords"))
        )
        known = row.balance.value
        # A sale stands on its own, and a deposit written with a zero balance leaves
        # the patient in credit: neither says anything about what is still owed.
        if sold or (deposit and not known):
            known = None
        expected = state.balance - paid + (paid if sold else 0)
        delta = known - expected if known is not None else 0
        paid_by_cheque = delta < 0 and cheque_word in payment_text

        # Everything doubtful about the row goes to the issues sheet and onto its lines.
        flags: list[str] = []
        if row.date_problem:
            flags.append(row.date_problem)
        for amount in (row.payment, row.balance):
            if amount.ambiguous:
                flags.append(
                    t("spreadsheet.issues.ambiguousAmount", raw=amount.raw, fixed=amount.value)
                )
            if amount.tiny:
                flags.append(t("spreadsheet.issues.tinyAmount", raw=amount.value))
            if amount.negative:
                flags.append(
                    t(
                        "spreadsheet.issues.negativeAmount",
                        raw=-(amount.value or 0),
                        fixed=amount.value,
                    )
                )
        if row.payment.value is None and row.payment.text and not paid_by_cheque:
            flags.append(t("spreadsheet.issues.unknownPayment", raw=row.payment.raw))
        if row.balance.value is None and row.balance.text and not sold and not deposit:
            flags.append(t("spreadsheet.issues.unknownBalance", raw=row.balance.raw))
        if delta < 0 and not paid_by_cheque:
            flags.append(t("spreadsheet.issues.balanceDrop", amount=-delta))
        if (paid and dest.method == PaymentMethod.CHEQUE) or paid_by_cheque:
            flags.append(t("spreadsheet.issues.chequeAssumedCleared"))
        for text in flags:
            self.issue(row.source, name.display, text)
        common: dict[str, Any] = {
            "on": row.on,
            "source": row.source,
            "doctor": row.doctor,
            "review": "\u061b ".join(flags) or None,
        }
        service = row.service or row.balance.text or None
        notes = " — ".join(row.dest.notes) or None

        if sold:  # an item or visit fee, paid on the spot
            self._line(name, type=TxType.CHARGE, amount=paid, description=service, **common)
        if delta > 0:  # treatment done since the previous row
            self._line(
                name,
                type=TxType.CHARGE,
                amount=delta,
                description=service if service and not deposit else t("spreadsheet.chargeNote"),
                **common,
            )
        if paid:
            self.accounts.use(dest)
            cheque = dest.method == PaymentMethod.CHEQUE
            self._line(
                name,
                type=TxType.PAYMENT,
                amount=paid,
                payer=row.payer,
                account=dest.account,
                method=dest.method,
                cheque_due=row.on if cheque else None,
                cheque_status=ChequeStatus.CLEARED if cheque else None,
                description=" — ".join(x for x in (service, notes) if x) or None,
                **common,
            )
        if paid_by_cheque:  # "paid by cheque" with no amount: the balance drop is the payment
            self.accounts.use(dest)
            self._line(
                name,
                type=TxType.PAYMENT,
                amount=-delta,
                payer=row.payer,
                account=dest.account,
                method=PaymentMethod.CHEQUE,
                cheque_due=row.on,
                cheque_status=ChequeStatus.CLEARED,
                description=row.payment.text,
                **common,
            )
        elif delta < 0:
            self._line(
                name,
                type=TxType.DISCOUNT,
                amount=-delta,
                description=t("spreadsheet.adjustNote"),
                **common,
            )
        state.balance = known if known is not None else expected

    def apply_debtors(self) -> None:
        listed: dict[CaseKey, list[_Debt]] = defaultdict(list)
        for debt in self.debts:
            listed[(debt.name.key, debt.name.case)].append(debt)

        for key, debts in listed.items():
            state = self.cases[key]
            name = debts[0].name
            target = sum(d.amount for d in debts)  # cheques are debt until they clear
            delta = target - state.balance
            if delta:
                if state.seen:
                    review = self.issue(
                        debts[0].source,
                        name.display,
                        t(
                            "spreadsheet.issues.debtorsMismatch",
                            computed=state.balance,
                            listed=target,
                        ),
                    )
                    note = t("spreadsheet.debtorsAdjustNote")
                else:
                    review, note = None, t("spreadsheet.openingNote")
                self._line(
                    name,
                    on=self.as_of,
                    type=TxType.CHARGE if delta > 0 else TxType.DISCOUNT,
                    amount=abs(delta),
                    description=" — ".join(
                        x for x in (note, *(d.note for d in debts if d.note and not d.cheque)) if x
                    ),
                    source=debts[0].source,
                    review=review,
                )
                state.balance = target
            state.seen = True
            cheques = [d for d in debts if d.cheque]
            if cheques and any(not d.cheque for d in debts):
                self.issue(debts[0].source, name.display, t("spreadsheet.issues.chequesAndBalance"))
            for d in cheques:
                review = (
                    None
                    if d.due
                    else self.issue(
                        d.source, name.display, t("spreadsheet.issues.chequeUnknownDue")
                    )
                )
                self._line(
                    name,
                    on=self.as_of,
                    type=TxType.PAYMENT,
                    amount=d.amount,
                    method=PaymentMethod.CHEQUE,
                    cheque_due=d.due,
                    cheque_status=ChequeStatus.PENDING,
                    payer=d.payer,
                    description=t("spreadsheet.chequeNote"),
                    source=d.source,
                    review=review,
                )

        for (pkey, case), state in self.cases.items():
            if state.balance <= 0 or (pkey, case) in listed:
                continue
            name = PatientName(self._display(pkey), pkey, case)
            if not self.settle_unlisted:
                self.issue(
                    "", name.display, t("spreadsheet.issues.notInDebtors", amount=state.balance)
                )
                continue
            review = self.issue(
                "", name.display, t("spreadsheet.issues.settledUnlisted", amount=state.balance)
            )
            self._line(
                name,
                on=self.as_of,
                type=TxType.DISCOUNT,
                amount=state.balance,
                description=t("spreadsheet.settleNote"),
                review=review,
            )
            state.balance = 0

    # ── Output ───────────────────────────────────────────────────────────────

    def _display(self, key: str) -> str:
        return self.names[key].most_common(1)[0][0] if self.names.get(key) else key

    def finish(self) -> StandardBook:
        book = self.book
        for line in book.lines:
            line.patient = self._display(line.patient)

        entries: dict[str, PatientEntry] = {}
        for key, spellings in self.names.items():
            display = self._display(key)
            entries[key] = PatientEntry(
                name=display, aliases={s for s in spellings if s != display}
            )
        keys = sorted(entries)
        for a, b in combinations(keys, 2):
            if min(len(a), len(b)) >= 6 and edit_distance(a, b, limit=2) <= 1:
                entries[a].possible_duplicates.append(entries[b].name)
                entries[b].possible_duplicates.append(entries[a].name)
                self.issue(
                    "",
                    entries[a].name,
                    t("spreadsheet.issues.possibleDuplicate", other=entries[b].name),
                )

        by_name = {e.name: e for e in entries.values()}
        for line in book.lines:
            entry = by_name[line.patient]
            if line.cheque_status == ChequeStatus.PENDING:
                entry.pending_cheques += line.amount
            elif line.cheque_status == ChequeStatus.BOUNCED:
                continue
            elif line.type in (TxType.CHARGE, TxType.REFUND):
                entry.balance += line.amount
            else:
                entry.balance -= line.amount

        book.patients = sorted(entries.values(), key=lambda e: (-e.balance, e.name))
        book.accounts = self.accounts.entries
        book.issues.sort(key=lambda i: (i.source == "", i.source, i.patient))
        return book


def convert_spreadsheet(path: Path, as_of: date, *, settle_unlisted: bool = False) -> StandardBook:
    """Read the practice's workbook and rebuild it as a reviewable standard book.

    `as_of` is the date of the debtors list.
    """
    conv = _Converter(as_of=as_of, settle_unlisted=settle_unlisted)
    conv.read(path)
    conv.replay()
    return conv.finish()
