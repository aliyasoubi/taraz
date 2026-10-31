"""Ledger lines: create, change, list, and keep each row consistent with its type."""

from dataclasses import dataclass
from datetime import date
from typing import Any

from sqlalchemy import ColumnElement, Select, func, select
from sqlalchemy.orm import Session, joinedload

from app.core.errors import InvalidError, NotFoundError
from app.models import (
    Account,
    ChequeStatus,
    Patient,
    PaymentMethod,
    Transaction,
    Treatment,
    TxType,
)
from app.schemas.transactions import (
    Suggestions,
    TransactionIn,
    TransactionOut,
    TransactionPage,
    TransactionPatch,
)
from app.services import ledger

_PAYMENT_FIELDS = ("payer_name", "account_id", "method", "reference")
_CHEQUE_FIELDS = ("cheque_due_on", "cheque_status")
# A PATCH may replace these but never clear them.
_REQUIRED_FIELDS = ("patient_id", "type", "amount", "occurred_on")


@dataclass(frozen=True)
class TransactionFilter:
    patient_id: int | None = None
    account_id: int | None = None
    type: TxType | None = None
    method: PaymentMethod | None = None
    cheque_status: ChequeStatus | None = None
    date_from: date | None = None
    date_to: date | None = None
    # Filter on the day the row takes effect (a cheque's due date) instead of its entry date.
    by_effective_date: bool = False

    def conditions(self) -> list[ColumnElement[bool]]:
        t = Transaction
        conds: list[ColumnElement[bool]] = []
        equals: list[tuple[Any, object]] = [
            (t.patient_id, self.patient_id),
            (t.account_id, self.account_id),
            (t.type, self.type),
            (t.method, self.method),
            (t.cheque_status, self.cheque_status),
        ]
        conds.extend(column == value for column, value in equals if value is not None)
        day = ledger.effective_on if self.by_effective_date else t.occurred_on
        if self.date_from is not None:
            conds.append(day >= self.date_from)
        if self.date_to is not None:
            conds.append(day <= self.date_to)
        return conds


# ── Reading ────────────────────────────────────────────────────────────────


def tx_select() -> Select[Transaction]:
    return select(Transaction).options(
        joinedload(Transaction.patient),
        joinedload(Transaction.treatment),
        joinedload(Transaction.account),
    )


def counts(tx: Transaction) -> bool:
    """Whether the row currently moves the balance (a cheque only once cleared)."""
    if tx.type != TxType.PAYMENT or tx.method != PaymentMethod.CHEQUE:
        return True
    return tx.cheque_status == ChequeStatus.CLEARED


def tx_to_out(tx: Transaction) -> TransactionOut:
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
        doctor=tx.doctor,
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


def count_transactions(db: Session) -> int:
    return int(db.scalar(select(func.count(Transaction.id))) or 0)


def has_transactions(db: Session) -> bool:
    return count_transactions(db) > 0


def get_transaction(db: Session, tx_id: int) -> Transaction:
    tx = db.scalars(tx_select().where(Transaction.id == tx_id)).first()
    if tx is None:
        raise NotFoundError("transaction_not_found")
    return tx


def list_transactions(
    db: Session, flt: TransactionFilter, limit: int = 100, offset: int = 0
) -> TransactionPage:
    conds = flt.conditions()
    total, sum_amount = db.execute(
        select(func.count(Transaction.id), func.coalesce(func.sum(Transaction.amount), 0)).where(
            *conds
        )
    ).one()
    # Cheques in hand read best by due date, soonest first; everything else newest first.
    order = (
        [Transaction.cheque_due_on.asc(), Transaction.id]
        if flt.cheque_status == ChequeStatus.PENDING
        else [Transaction.occurred_on.desc(), Transaction.id.desc()]
    )
    rows = db.scalars(tx_select().where(*conds).order_by(*order).limit(limit).offset(offset))
    return TransactionPage(
        items=[tx_to_out(tx) for tx in rows.all()], total=int(total), sum_amount=int(sum_amount)
    )


def suggestions(db: Session) -> Suggestions:
    """Payer and doctor names already used, most frequent first, for autocomplete."""
    payers = db.scalars(
        select(Transaction.payer_name)
        .where(Transaction.payer_name.is_not(None))
        .group_by(Transaction.payer_name)
        .order_by(func.count().desc(), func.max(Transaction.occurred_on).desc())
        .limit(50)
    )
    doctors: list[str | None] = []
    for column in (Transaction.doctor, Treatment.doctor):
        doctors += db.scalars(
            select(column)
            .where(column.is_not(None))
            .group_by(column)
            .order_by(func.count().desc())
            .limit(30)
        )
    unique_doctors = list(dict.fromkeys(d for d in doctors if d))
    return Suggestions(payers=[p for p in payers if p], doctors=unique_doctors)


# ── Writing ────────────────────────────────────────────────────────────────


def normalize(tx: Transaction) -> None:
    """Make a row consistent for its type.

    Fields that do not apply to the type are cleared rather than rejected, so
    switching a draft from payment to charge in the UI just works.
    """
    if tx.type in (TxType.CHARGE, TxType.DISCOUNT):
        for field in _PAYMENT_FIELDS + _CHEQUE_FIELDS:
            setattr(tx, field, None)
        return
    tx.method = tx.method or PaymentMethod.CARD
    if tx.type == TxType.REFUND:
        tx.payer_name = None
    if tx.type == TxType.PAYMENT and tx.method == PaymentMethod.CHEQUE:
        tx.cheque_status = tx.cheque_status or ChequeStatus.PENDING
    else:
        tx.cheque_due_on = None
        tx.cheque_status = None


def _check_references(db: Session, tx: Transaction) -> None:
    if db.get(Patient, tx.patient_id) is None:
        raise InvalidError("patient_not_found")
    if tx.treatment_id is not None:
        treatment = db.get(Treatment, tx.treatment_id)
        if treatment is None or treatment.patient_id != tx.patient_id:
            raise InvalidError("treatment_not_owned")
    if tx.account_id is not None and db.get(Account, tx.account_id) is None:
        raise InvalidError("account_not_found")


def _save(db: Session, tx: Transaction, changes: dict[str, Any]) -> TransactionOut:
    for key, value in changes.items():
        setattr(tx, key, value)
    normalize(tx)
    _check_references(db, tx)
    db.add(tx)
    db.commit()
    db.expire_all()
    return tx_to_out(get_transaction(db, tx.id))


def create_transaction(db: Session, data: TransactionIn) -> TransactionOut:
    fields = data.model_dump(exclude={"with_charge"})
    if data.with_charge:
        if data.type != TxType.PAYMENT:
            raise InvalidError("with_charge_needs_payment")
        # Saved with the payment below, in one commit.
        charge = Transaction(**{**fields, "type": TxType.CHARGE})
        normalize(charge)
        _check_references(db, charge)
        db.add(charge)
    return _save(db, Transaction(), fields)


def update_transaction(db: Session, tx_id: int, data: TransactionPatch) -> TransactionOut:
    tx = get_transaction(db, tx_id)
    changes = {
        key: value
        for key, value in data.model_dump(exclude_unset=True).items()
        if not (key in _REQUIRED_FIELDS and value is None)
    }
    # Moving a row to another patient drops a case that belonged to the old one.
    if changes.get("patient_id", tx.patient_id) != tx.patient_id and "treatment_id" not in changes:
        changes["treatment_id"] = None
    return _save(db, tx, changes)


def delete_transaction(db: Session, tx_id: int) -> None:
    db.delete(get_transaction(db, tx_id))
    db.commit()
