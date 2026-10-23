from dataclasses import dataclass
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import jdatetime

from app.core.config import get_settings
from app.core.i18n import t


@dataclass(frozen=True)
class JMonth:
    year: int
    month: int

    @property
    def start(self) -> date:
        return jdatetime.date(self.year, self.month, 1).togregorian()

    @property
    def end(self) -> date:
        return self.next().start - timedelta(days=1)

    @property
    def label(self) -> str:
        return f"{t('months')[self.month - 1]} {self.year}"

    def next(self) -> "JMonth":
        return JMonth(self.year + 1, 1) if self.month == 12 else JMonth(self.year, self.month + 1)

    def prev(self) -> "JMonth":
        return JMonth(self.year - 1, 12) if self.month == 1 else JMonth(self.year, self.month - 1)

    @classmethod
    def of(cls, d: date) -> "JMonth":
        j = jdatetime.date.fromgregorian(date=d)
        return cls(j.year, j.month)


def today() -> date:
    """Today on the clinic's calendar, not the server's UTC clock."""
    return datetime.now(ZoneInfo(get_settings().timezone)).date()


def to_jalali_str(d: date | None) -> str:
    return jdatetime.date.fromgregorian(date=d).strftime("%Y/%m/%d") if d else ""


def parse_jalali(text: str) -> date | None:
    """Lenient parse of the formats found in the old sheets: 1405-07-01, 1405/7/1, 1405,04,30."""
    parts = [p for p in text.replace("/", "-").replace(",", "-").split("-") if p.strip()]
    if len(parts) != 3:
        return None
    try:
        y, m, d = (int(p) for p in parts)
        return jdatetime.date(y, m, d).togregorian()
    except ValueError:
        return None
