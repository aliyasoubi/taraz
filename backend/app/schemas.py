from datetime import date, datetime
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, StringConstraints

from app.models import (
    AccountKind,
    ChequeStatus,
    PaymentMethod,
    TreatmentKind,
    TreatmentStatus,
    TxType,
)


def _blank_to_none(v: object) -> object:
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


# Blank strings from a cleared form field mean "no value".
_Blank = BeforeValidator(_blank_to_none)

Str80 = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
Str120 = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
OptStr32 = Annotated[Annotated[str, StringConstraints(max_length=32)] | None, _Blank]
OptStr40 = Annotated[Annotated[str, StringConstraints(max_length=40)] | None, _Blank]
OptStr64 = Annotated[Annotated[str, StringConstraints(max_length=64)] | None, _Blank]
OptStr80 = Annotated[Annotated[str, StringConstraints(max_length=80)] | None, _Blank]
OptStr120 = Annotated[Annotated[str, StringConstraints(max_length=120)] | None, _Blank]
OptStr300 = Annotated[Annotated[str, StringConstraints(max_length=300)] | None, _Blank]
OptText = Annotated[Annotated[str, StringConstraints(max_length=2000)] | None, _Blank]
Last4 = Annotated[Annotated[str, Field(pattern=r"^\d{4}$")] | None, _Blank]
ColorKey = Annotated[str, Field(pattern=r"^[a-z]{3,16}$")]


# Rials. The ceiling is far above any real bill and keeps a mistyped run of zeros out.
Amount = Annotated[int, Field(gt=0, le=10**14)]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── Patients ───────────────────────────────────────────────────────────────


class PatientIn(BaseModel):
    name: Str120
    phone: OptStr32 = None
    note: OptText = None


class PatientPatch(BaseModel):
    name: Str120 | None = None
    phone: OptStr32 = None
    note: OptText = None
    is_archived: bool | None = None


class BalanceFields(BaseModel):
    balance: int = 0
    charged: int = 0
    paid: int = 0
    discounted: int = 0
    pending_cheques: int = 0
    last_activity: date | None = None
    tx_count: int = 0


class PatientOut(ORM, BalanceFields):
    id: int
    name: str
    phone: str | None
    note: str | None
    is_archived: bool
    created_at: datetime


class TreatmentIn(BaseModel):
    title: Str120
    kind: TreatmentKind = TreatmentKind.GENERAL
    doctor: OptStr80 = None
    status: TreatmentStatus = TreatmentStatus.ACTIVE
    note: OptText = None


class TreatmentPatch(BaseModel):
    title: Str120 | None = None
    kind: TreatmentKind | None = None
    doctor: OptStr80 = None
    status: TreatmentStatus | None = None
    note: OptText = None


class TreatmentOut(ORM, BalanceFields):
    id: int
    patient_id: int
    title: str
    kind: TreatmentKind
    doctor: str | None
    status: TreatmentStatus
    note: str | None
    created_at: datetime


class PatientDetail(PatientOut):
    treatments: list[TreatmentOut]


# ── Accounts ───────────────────────────────────────────────────────────────


class AccountIn(BaseModel):
    title: Str80
    owner_name: OptStr80 = None
    bank: OptStr40 = None
    kind: AccountKind = AccountKind.OWN
    card_last4: Last4 = None
    color: ColorKey = "violet"
    note: OptText = None


class AccountPatch(BaseModel):
    title: Str80 | None = None
    owner_name: OptStr80 = None
    bank: OptStr40 = None
    kind: AccountKind | None = None
    card_last4: Last4 = None
    color: ColorKey | None = None
    note: OptText = None
    is_archived: bool | None = None


class AccountOut(ORM):
    id: int
    title: str
    owner_name: str | None
    bank: str | None
    kind: AccountKind
    card_last4: str | None
    color: str
    note: str | None
    is_archived: bool
    received_total: int = 0
    received_this_month: int = 0
    pending_cheques: int = 0
    tx_count: int = 0
    last_received_on: date | None = None


# ── Transactions ───────────────────────────────────────────────────────────


class TransactionIn(BaseModel):
    patient_id: int
    treatment_id: int | None = None
    type: TxType
    amount: Amount
    occurred_on: date
    description: OptStr300 = None
    payer_name: OptStr120 = None
    account_id: int | None = None
    method: PaymentMethod | None = None
    reference: OptStr64 = None
    cheque_due_on: date | None = None
    cheque_status: ChequeStatus | None = None


class TransactionPatch(BaseModel):
    """Partial update. Only fields present in the request body are applied."""

    patient_id: int | None = None
    treatment_id: int | None = None
    type: TxType | None = None
    amount: Amount | None = None
    occurred_on: date | None = None
    description: OptStr300 = None
    payer_name: OptStr120 = None
    account_id: int | None = None
    method: PaymentMethod | None = None
    reference: OptStr64 = None
    cheque_due_on: date | None = None
    cheque_status: ChequeStatus | None = None


class TransactionOut(ORM):
    id: int
    patient_id: int
    patient_name: str
    treatment_id: int | None
    treatment_title: str | None
    type: TxType
    amount: int
    occurred_on: date
    description: str | None
    payer_name: str | None
    account_id: int | None
    account_title: str | None
    account_bank: str | None
    account_color: str | None
    method: PaymentMethod | None
    reference: str | None
    cheque_due_on: date | None
    cheque_status: ChequeStatus | None
    counts: bool  # whether it currently moves the balance
    created_at: datetime
    updated_at: datetime


class TransactionPage(BaseModel):
    items: list[TransactionOut]
    total: int
    sum_amount: int


# ── Reports ────────────────────────────────────────────────────────────────


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


class Suggestions(BaseModel):
    payers: list[str]
    doctors: list[str]
