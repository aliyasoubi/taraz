from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query, status
from sqlalchemy import func, select

from app.db import DbSession
from app.models import ChequeStatus, PaymentMethod, Transaction, Treatment, TxType
from app.schemas import (
    Suggestions,
    TransactionIn,
    TransactionOut,
    TransactionPage,
    TransactionPatch,
)
from app.services import ledger
from app.services.transactions import apply, get_or_404, to_out, tx_select

router = APIRouter(tags=["transactions"])


@router.get("/transactions", response_model=TransactionPage)
def list_transactions(
    db: DbSession,
    patient_id: int | None = None,
    account_id: int | None = None,
    type_: Annotated[TxType | None, Query(alias="type")] = None,
    method: PaymentMethod | None = None,
    cheque_status: ChequeStatus | None = None,
    date_from: Annotated[date | None, Query(alias="from")] = None,
    date_to: Annotated[date | None, Query(alias="to")] = None,
    by_effective_date: bool = False,
    limit: Annotated[int, Query(le=1000)] = 100,
    offset: int = 0,
) -> TransactionPage:
    filters = []
    if patient_id is not None:
        filters.append(Transaction.patient_id == patient_id)
    if account_id is not None:
        filters.append(Transaction.account_id == account_id)
    if type_ is not None:
        filters.append(Transaction.type == type_)
    if method is not None:
        filters.append(Transaction.method == method)
    if cheque_status is not None:
        filters.append(Transaction.cheque_status == cheque_status)
    day = ledger.effective_on if by_effective_date else Transaction.occurred_on
    if date_from is not None:
        filters.append(day >= date_from)
    if date_to is not None:
        filters.append(day <= date_to)

    total, sum_amount = db.execute(
        select(func.count(Transaction.id), func.coalesce(func.sum(Transaction.amount), 0)).where(
            *filters
        )
    ).one()
    order = (
        [Transaction.cheque_due_on.asc(), Transaction.id]
        if cheque_status == ChequeStatus.PENDING
        else [Transaction.occurred_on.desc(), Transaction.id.desc()]
    )
    rows = db.scalars(tx_select().where(*filters).order_by(*order).limit(limit).offset(offset))
    return TransactionPage(
        items=[to_out(tx) for tx in rows.all()], total=int(total), sum_amount=int(sum_amount)
    )


@router.post("/transactions", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(body: TransactionIn, db: DbSession) -> TransactionOut:
    tx = apply(db, Transaction(), body.model_dump())
    db.add(tx)
    db.commit()
    return to_out(get_or_404(db, tx.id))


@router.get("/transactions/{tx_id}", response_model=TransactionOut)
def get_transaction(tx_id: int, db: DbSession) -> TransactionOut:
    return to_out(get_or_404(db, tx_id))


@router.patch("/transactions/{tx_id}", response_model=TransactionOut)
def update_transaction(tx_id: int, body: TransactionPatch, db: DbSession) -> TransactionOut:
    tx = get_or_404(db, tx_id)
    data = body.model_dump(exclude_unset=True)
    # These may not be cleared, only replaced.
    for key in ("patient_id", "type", "amount", "occurred_on"):
        if key in data and data[key] is None:
            del data[key]
    if "patient_id" in data and data["patient_id"] != tx.patient_id and "treatment_id" not in data:
        data["treatment_id"] = None
    apply(db, tx, data)
    db.commit()
    db.expire_all()
    return to_out(get_or_404(db, tx_id))


@router.delete("/transactions/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(tx_id: int, db: DbSession) -> None:
    db.delete(get_or_404(db, tx_id))
    db.commit()


@router.get("/suggestions", response_model=Suggestions)
def suggestions(db: DbSession) -> Suggestions:
    """Payer and doctor names already used, most frequent first, for autocomplete."""
    payers = db.execute(
        select(Transaction.payer_name, func.count())
        .where(Transaction.payer_name.is_not(None))
        .group_by(Transaction.payer_name)
        .order_by(func.count().desc(), func.max(Transaction.occurred_on).desc())
        .limit(50)
    ).all()
    doctors = db.execute(
        select(Treatment.doctor, func.count())
        .where(Treatment.doctor.is_not(None))
        .group_by(Treatment.doctor)
        .order_by(func.count().desc())
        .limit(30)
    ).all()
    return Suggestions(payers=[p for p, _ in payers], doctors=[d for d, _ in doctors])
