"""Parsing single cells of the old workbook: amounts, Jalali dates, patient names."""

import re
from dataclasses import dataclass
from datetime import date, datetime

import jdatetime

from app.core.i18n import t
from app.models import TreatmentKind
from app.utils.text import fold, tidy

_PERSIAN_DIGITS = str.maketrans({chr(0x06F0 + i): str(i) for i in range(10)})
_ARABIC_DIGITS = str.maketrans({chr(0x0660 + i): str(i) for i in range(10)})


def ascii_digits(text: str) -> str:
    return text.translate(_PERSIAN_DIGITS).translate(_ARABIC_DIGITS)


def text_of(value: object) -> str:
    """A cell as clean text; numbers stored as text keep their digits."""
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    return tidy(str(value)).strip(" ?\u061f")


# ── Amounts ──────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class Amount:
    value: int | None = None
    # Words found where a number was expected ("deposit", "visit", "?" …).
    text: str | None = None
    # Digits were recovered from a malformed number such as "150,000,00".
    ambiguous: bool = False
    # Far below any real fee (a balance of 9 rials): almost surely a typo.
    tiny: bool = False
    # Written with a minus sign; the value is kept positive and flagged.
    negative: bool = False

    @property
    def raw(self) -> str:
        return self.text or ("" if self.value is None else str(self.value))


TINY_RIALS = 1_000_000
_GROUPED = re.compile(r"^\d{1,3}(,\d{3})*$")


def parse_amount(cell: object) -> Amount:
    if cell is None or cell == "":
        return Amount()
    if isinstance(cell, int | float):
        value = abs(int(cell))
        return Amount(value=value, tiny=0 < value < TINY_RIALS, negative=cell < 0)
    text = ascii_digits(str(cell)).replace("\u066c", ",").strip()
    compact = text.replace(" ", "")
    if re.fullmatch(r"[\d,]+", compact) and any(c.isdigit() for c in compact):
        return Amount(value=int(compact.replace(",", "")), ambiguous=not _GROUPED.match(compact))
    if re.fullmatch(r"\d+(\.0+)?", compact):
        return Amount(value=int(float(compact)))
    return Amount(text=tidy(str(cell)).strip() or None)


# ── Dates ────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class ParsedDate:
    on: date | None
    problem: str | None = None  # an issue text when the cell needed fixing


def _jalali(y: int, m: int, d: int) -> date | None:
    try:
        return jdatetime.date(y, m, d).togregorian()
    except ValueError:
        return None


def jalali_text(d: date) -> str:
    return jdatetime.date.fromgregorian(date=d).strftime("%Y/%m/%d")


def parse_date(
    cell: object, sheet_month: tuple[int, int] | None, fallback: date | None
) -> ParsedDate:
    """A Jalali date from a cell, repaired where it is clearly a typo.

    `sheet_month` is the (year, month) of a monthly sheet: a date in another month
    of such a sheet is taken as a typo for the same day of the sheet's month.
    `fallback` (the previous row's date) fills a missing or unreadable cell.
    """
    raw = text_of(cell)
    parts: list[int] = []
    if isinstance(cell, datetime | date):
        # Excel turned "1405/04/28" into the Gregorian year 2405; keep month and day.
        parts = [cell.year - 1000 if cell.year > 2000 else cell.year, cell.month, cell.day]
    elif raw:
        parts = [int(p) for p in re.findall(r"\d+", ascii_digits(raw))]

    def fixed(on: date | None, key: str) -> ParsedDate:
        on = on or fallback
        shown = jalali_text(on) if on else "?"
        return ParsedDate(on, t(f"legacy.issues.{key}", raw=raw or "-", fixed=shown))

    if len(parts) < 2:
        return fixed(None, "missingDate" if not raw else "badDate")
    y, m = parts[0], parts[1]
    d = parts[2] if len(parts) > 2 else None
    repaired = False
    if y > 1500:  # "1705" for 1405: a slipped digit in the century
        y, repaired = 1400 + y % 100, True
    if d is not None and d > 31 and d % 100 <= 31:  # "024" for 24
        d, repaired = d % 100, True
    if sheet_month and (y, m) != sheet_month:
        # A monthly sheet's rows belong to its month; keep the day if it is a real one.
        if d is not None and (on := _jalali(*sheet_month, d)):
            return fixed(on, "dateOutsideSheet")
        return fixed(None, "dateOutsideSheet")
    if d is None or m > 12:
        return fixed(None, "badDate")  # never guess a month
    on = _jalali(y, m, d)
    if on is None:
        return fixed(None, "badDate")
    clean = isinstance(cell, str) and re.fullmatch(r"\d{4}[-/]\d{2}[-/]\d{2}", ascii_digits(raw))
    if clean and not repaired:
        return ParsedDate(on)
    return ParsedDate(on, t("legacy.issues.badDate", raw=raw, fixed=jalali_text(on)))


# ── Names ────────────────────────────────────────────────────────────────────


def _suffix_patterns() -> list[tuple[re.Pattern[str], TreatmentKind]]:
    patterns = []
    for kind, words in t("legacy.caseSuffixes").items():
        alternatives = "|".join(re.escape(w) for w in sorted(words, key=len, reverse=True))
        # "…imp" is often glued to the surname; the Persian words come after a space.
        patterns.append(
            (re.compile(rf"\s*({alternatives})\s*$", re.IGNORECASE), TreatmentKind(kind))
        )
    return patterns


_SUFFIXES = _suffix_patterns()
_NAME_NOISE = re.compile(r"[.()\u061F?]+")


@dataclass(frozen=True)
class PatientName:
    display: str
    key: str
    case: TreatmentKind | None


def parse_name(cell: object) -> PatientName | None:
    raw = _NAME_NOISE.sub(" ", text_of(cell))
    name = tidy(raw)
    if not name:
        return None
    case = None
    for pattern, kind in _SUFFIXES:
        if pattern.search(name):
            name, case = tidy(pattern.sub("", name)), kind
            break
    return PatientName(display=name, key=name_key(name), case=case)


def name_key(name: str) -> str:
    """Spelling-insensitive identity: letter variants, spaces and half-spaces ignored."""
    return fold(name).replace(" ", "")


def edit_distance(a: str, b: str, limit: int = 3) -> int:
    """Levenshtein distance, giving up (returning `limit`) once it exceeds the limit."""
    if abs(len(a) - len(b)) >= limit:
        return limit
    previous = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        current = [i]
        for j, cb in enumerate(b, 1):
            current.append(min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (ca != cb)))
        if min(current) >= limit:
            return limit
        previous = current
    return min(previous[-1], limit)
