from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.api.deps import DbSession
from app.models import ChequeStatus, PaymentMethod, TxType
from app.schemas.transactions import (
    Suggestions,
    TransactionIn,
    TransactionOut,
    TransactionPage,
    TransactionPatch,
)
from app.services import transactions
from app.services.transactions import TransactionFilter

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
    offset: Annotated[int, Query(ge=0)] = 0,
) -> TransactionPage:
    flt = TransactionFilter(
        patient_id=patient_id,
        account_id=account_id,
        type=type_,
        method=method,
        cheque_status=cheque_status,
        date_from=date_from,
        date_to=date_to,
        by_effective_date=by_effective_date,
    )
    return transactions.list_transactions(db, flt, limit=limit, offset=offset)


@router.post("/transactions", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(body: TransactionIn, db: DbSession) -> TransactionOut:
    return transactions.create_transaction(db, body)


@router.get("/transactions/{tx_id}", response_model=TransactionOut)
def get_transaction(tx_id: int, db: DbSession) -> TransactionOut:
    return transactions.tx_to_out(transactions.get_transaction(db, tx_id))


@router.patch("/transactions/{tx_id}", response_model=TransactionOut)
def update_transaction(tx_id: int, body: TransactionPatch, db: DbSession) -> TransactionOut:
    return transactions.update_transaction(db, tx_id, body)


@router.delete("/transactions/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(tx_id: int, db: DbSession) -> None:
    transactions.delete_transaction(db, tx_id)


@router.get("/suggestions", response_model=Suggestions)
def suggestions(db: DbSession) -> Suggestions:
    return transactions.suggestions(db)
