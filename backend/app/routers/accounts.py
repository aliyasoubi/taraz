from fastapi import APIRouter, HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.db import DbSession
from app.models import Account, Transaction
from app.schemas import AccountIn, AccountOut, AccountPatch
from app.services import ledger
from app.services.jalali import JMonth, today

router = APIRouter(tags=["accounts"])


def _accounts_with_totals(db: Session, account_id: int | None = None) -> list[AccountOut]:
    month = JMonth.of(today())
    in_month = and_(ledger.effective_on >= month.start, ledger.effective_on <= month.end)
    totals = (
        select(
            Transaction.account_id.label("key"),
            ledger.sum_where(ledger.counts_as_paid).label("received_total"),
            ledger.sum_where(and_(ledger.counts_as_paid, in_month)).label("received_this_month"),
            ledger.sum_where(ledger.is_pending_cheque).label("pending_cheques"),
            func.count(Transaction.id).label("tx_count"),
            func.max(Transaction.occurred_on).label("last_received_on"),
        )
        .where(Transaction.account_id.is_not(None))
        .group_by(Transaction.account_id)
        .subquery()
    )
    stmt = (
        select(Account, totals)
        .outerjoin(totals, totals.c.key == Account.id)
        .order_by(Account.is_archived, func.coalesce(totals.c.tx_count, 0).desc(), Account.id)
    )
    if account_id is not None:
        stmt = stmt.where(Account.id == account_id)
    out = []
    for row in db.execute(stmt):
        base = AccountOut.model_validate(row[0]).model_dump()
        out.append(
            AccountOut(
                **{
                    **base,
                    "received_total": int(row.received_total or 0),
                    "received_this_month": int(row.received_this_month or 0),
                    "pending_cheques": int(row.pending_cheques or 0),
                    "tx_count": int(row.tx_count or 0),
                    "last_received_on": row.last_received_on,
                }
            )
        )
    return out


def _one(db: Session, account_id: int) -> AccountOut:
    found = _accounts_with_totals(db, account_id)
    if not found:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "account_not_found")
    return found[0]


@router.get("/accounts", response_model=list[AccountOut])
def list_accounts(db: DbSession) -> list[AccountOut]:
    return _accounts_with_totals(db)


@router.get("/accounts/{account_id}", response_model=AccountOut)
def get_account(account_id: int, db: DbSession) -> AccountOut:
    return _one(db, account_id)


@router.post("/accounts", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
def create_account(body: AccountIn, db: DbSession) -> AccountOut:
    account = Account(**body.model_dump())
    db.add(account)
    db.commit()
    return _one(db, account.id)


@router.patch("/accounts/{account_id}", response_model=AccountOut)
def update_account(account_id: int, body: AccountPatch, db: DbSession) -> AccountOut:
    account = db.get(Account, account_id)
    if account is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "account_not_found")
    for key, value in body.model_dump(exclude_unset=True).items():
        if value is None and key in ("title", "kind", "color", "is_archived"):
            continue
        setattr(account, key, value)
    db.commit()
    return _one(db, account_id)


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(account_id: int, db: DbSession) -> None:
    account = db.get(Account, account_id)
    if account is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "account_not_found")
    used = db.scalar(select(func.count()).where(Transaction.account_id == account_id))
    if used:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "account_in_use",
        )
    db.delete(account)
    db.commit()
