from datetime import date, datetime

from pydantic import BaseModel

from app.models import ChequeStatus, PaymentMethod, TxType
from app.schemas.common import ORM, Amount, OptStr64, OptStr80, OptStr120, OptStr300


class TransactionIn(BaseModel):
    patient_id: int
    treatment_id: int | None = None
    type: TxType
    amount: Amount
    occurred_on: date
    description: OptStr300 = None
    doctor: OptStr80 = None
    payer_name: OptStr120 = None
    account_id: int | None = None
    method: PaymentMethod | None = None
    reference: OptStr64 = None
    cheque_due_on: date | None = None
    cheque_status: ChequeStatus | None = None
    # A payment for an item or visit fee paid on the spot also records its charge.
    with_charge: bool = False


class TransactionPatch(BaseModel):
    """Partial update. Only fields present in the request body are applied."""

    patient_id: int | None = None
    treatment_id: int | None = None
    type: TxType | None = None
    amount: Amount | None = None
    occurred_on: date | None = None
    description: OptStr300 = None
    doctor: OptStr80 = None
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
    doctor: str | None
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


class Suggestions(BaseModel):
    payers: list[str]
    doctors: list[str]
