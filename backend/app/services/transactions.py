from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import Select, select
from sqlalchemy.orm import Session, joinedload

from app.models import (
    Account,
    ChequeStatus,
    Patient,
    PaymentMethod,
    Transaction,
    Treatment,
    TxType,
)
from app.schemas import TransactionOut

_PAYMENT_FIELDS = ("payer_name", "account_id", "method", "reference")
_CHEQUE_FIELDS = ("cheque_due_on", "cheque_status")


def tx_select() -> Select[Transaction]:
    return select(Transaction).options(
        joinedload(Transaction.patient),
        joinedload(Transaction.treatment),
        joinedload(Transaction.account),
    )


def counts(tx: Transaction) -> bool:
    if tx.type != TxType.PAYMENT or tx.method != PaymentMethod.CHEQUE:
        return True
    return tx.cheque_status == ChequeStatus.CLEARED


def to_out(tx: Transaction) -> TransactionOut:
    return TransactionOut(
        id=tx.id,
        patient_id=tx.patient_id,
        patient_name=tx.patient.name,
        treatment_id=tx.treatment_id,
        treatment_title=tx.treatment.title if tx.treatment else None,
        type=tx.type,
        amount=tx.amount,
        occurred_on=tx.occurred_on,
        description=tx.description,
        payer_name=tx.payer_name,
        account_id=tx.account_id,
        account_title=tx.account.title if tx.account else None,
        account_bank=tx.account.bank if tx.account else None,
        account_color=tx.account.color if tx.account else None,
        method=tx.method,
        reference=tx.reference,
        cheque_due_on=tx.cheque_due_on,
        cheque_status=tx.cheque_status,
        counts=counts(tx),
        created_at=tx.created_at,
        updated_at=tx.updated_at,
    )


def _bad(code: str) -> HTTPException:
    return HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, code)


def apply(db: Session, tx: Transaction, data: dict[str, Any]) -> Transaction:
    """Merge `data` into `tx`, then make the row consistent for its type.

    Fields that do not apply to the final type are cleared rather than
    rejected, so switching a draft from payment to charge in the UI just works.
    """
    for key, value in data.items():
        setattr(tx, key, value)

    if db.get(Patient, tx.patient_id) is None:
        raise _bad("patient_not_found")

    if tx.treatment_id is not None:
        treatment = db.get(Treatment, tx.treatment_id)
        if treatment is None or treatment.patient_id != tx.patient_id:
            raise _bad("treatment_not_owned")

    if tx.type in (TxType.CHARGE, TxType.DISCOUNT):
        for f in _PAYMENT_FIELDS + _CHEQUE_FIELDS:
            setattr(tx, f, None)
        return tx

    if tx.account_id is not None and db.get(Account, tx.account_id) is None:
        raise _bad("account_not_found")
    if tx.method is None:
        tx.method = PaymentMethod.CARD

    if tx.type == TxType.REFUND:
        tx.payer_name = None

    if tx.type == TxType.PAYMENT and tx.method == PaymentMethod.CHEQUE:
        tx.cheque_status = tx.cheque_status or ChequeStatus.PENDING
    else:
        tx.cheque_due_on = None
        tx.cheque_status = None
    return tx


def get_or_404(db: Session, tx_id: int) -> Transaction:
    tx = db.scalars(tx_select().where(Transaction.id == tx_id)).first()
    if tx is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "transaction_not_found")
    return tx
