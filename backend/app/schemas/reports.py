from datetime import date

from pydantic import BaseModel

from app.schemas.transactions import TransactionOut


class MonthRef(BaseModel):
    year: int
    month: int
    label: str
    start: date
    end: date


class SeriesPoint(BaseModel):
    year: int
    month: int
    label: str
    received: int
    charged: int


class DebtorRow(BaseModel):
    id: int
    name: str
    balance: int
    pending_cheques: int
    last_activity: date | None


class Dashboard(BaseModel):
    month: MonthRef
    receivable: int  # sum of positive balances
    credit: int  # sum of negative balances (prepaid), as a positive number
    debtors_count: int
    patients_count: int
    received_this_month: int
    charged_this_month: int
    received_today: int
    pending_cheques_total: int
    pending_cheques_count: int
    series: list[SeriesPoint]
    top_debtors: list[DebtorRow]
    upcoming_cheques: list[TransactionOut]
    recent: list[TransactionOut]


class StatementRow(BaseModel):
    id: int
    name: str
    opening: int
    charged: int
    paid: int
    discounted: int
    refunded: int
    closing: int
    pending_cheques: int


class BreakdownRow(BaseModel):
    key: str
    label: str
    amount: int
    count: int
    color: str | None = None


class MonthlyReport(BaseModel):
    month: MonthRef
    opening_receivable: int
    closing_receivable: int
    closing_credit: int
    charged: int
    paid: int
    discounted: int
    refunded: int
    debtors_count: int
    by_account: list[BreakdownRow]
    by_method: list[BreakdownRow]
    rows: list[StatementRow]
    cheques_due: list[TransactionOut]
