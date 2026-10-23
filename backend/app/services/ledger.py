"""Balance arithmetic, expressed once as SQL so every screen agrees.

Sign convention: positive = the patient owes the clinic.
"""

from dataclasses import dataclass
from datetime import date
from typing import Any

from sqlalchemy import ColumnElement, Select, and_, case, func, or_, select
from sqlalchemy.orm import InstrumentedAttribute, Session

from app.models import ChequeStatus, PaymentMethod, Transaction, TxType

T = Transaction
GroupCol = InstrumentedAttribute[int] | InstrumentedAttribute[int | None]

is_cheque = T.method == PaymentMethod.CHEQUE

# A payment counts once the money is real: immediately, or for a cheque once it clears.
counts_as_paid: ColumnElement[bool] = and_(
    T.type == TxType.PAYMENT,
    or_(
        T.method.is_(None),
        T.method != PaymentMethod.CHEQUE,
        T.cheque_status == ChequeStatus.CLEARED,
    ),
)
is_pending_cheque: ColumnElement[bool] = and_(
    T.type == TxType.PAYMENT, is_cheque, T.cheque_status == ChequeStatus.PENDING
)

# The day the row takes effect. A cleared cheque lands on its due date.
effective_on: ColumnElement[date] = case(
    (is_cheque, func.coalesce(T.cheque_due_on, T.occurred_on)), else_=T.occurred_on
)

signed_amount: ColumnElement[int] = case(
    (T.type.in_([TxType.CHARGE, TxType.REFUND]), T.amount),
    (T.type == TxType.DISCOUNT, -T.amount),
    (counts_as_paid, -T.amount),
    else_=0,
)


def sum_where(cond: ColumnElement[bool]) -> ColumnElement[Any]:
    return func.coalesce(func.sum(case((cond, T.amount), else_=0)), 0)


def totals_select(group_col: GroupCol, as_of: date | None = None) -> Select[Any]:
    """Per-group balance figures. `group_col` is patient_id or treatment_id."""
    stmt = select(
        group_col.label("key"),
        func.coalesce(func.sum(signed_amount), 0).label("balance"),
        sum_where(T.type == TxType.CHARGE).label("charged"),
        sum_where(counts_as_paid).label("paid"),
        sum_where(T.type == TxType.DISCOUNT).label("discounted"),
        sum_where(is_pending_cheque).label("pending_cheques"),
        func.max(T.occurred_on).label("last_activity"),
        func.count(T.id).label("tx_count"),
    ).group_by(group_col)
    if as_of is not None:
        stmt = stmt.where(effective_on <= as_of)
    return stmt


@dataclass
class Totals:
    balance: int = 0
    charged: int = 0
    paid: int = 0
    discounted: int = 0
    pending_cheques: int = 0
    last_activity: date | None = None
    tx_count: int = 0


def totals_by(
    db: Session, group_col: GroupCol, keys: list[int] | None = None, as_of: date | None = None
) -> dict[int, Totals]:
    stmt = totals_select(group_col, as_of)
    if keys is not None:
        if not keys:
            return {}
        stmt = stmt.where(group_col.in_(keys))
    return {
        row.key: Totals(
            balance=int(row.balance),
            charged=int(row.charged),
            paid=int(row.paid),
            discounted=int(row.discounted),
            pending_cheques=int(row.pending_cheques),
            last_activity=row.last_activity,
            tx_count=int(row.tx_count),
        )
        for row in db.execute(stmt)
        if row.key is not None
    }


def patient_totals(
    db: Session, keys: list[int] | None = None, as_of: date | None = None
) -> dict[int, Totals]:
    return totals_by(db, T.patient_id, keys, as_of)


def treatment_totals(db: Session, keys: list[int]) -> dict[int, Totals]:
    return totals_by(db, T.treatment_id, keys)
