"""Destination accounts: where payments land."""

from typing import Any

from sqlalchemy import Row, Select, and_, func, select
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError
from app.models import Account, Transaction
from app.schemas.accounts import AccountIn, AccountOut, AccountPatch
from app.services import ledger
from app.utils.jalali import JMonth, today
from app.utils.patching import apply_patch


def _with_totals() -> Select[Any]:
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
    return (
        select(Account, totals)
        .outerjoin(totals, totals.c.key == Account.id)
        .order_by(Account.is_archived, func.coalesce(totals.c.tx_count, 0).desc(), Account.id)
    )


def _to_out(row: Row[Any]) -> AccountOut:
    return AccountOut.model_validate(
        {
            **AccountOut.model_validate(row[0]).model_dump(),
            "received_total": int(row.received_total or 0),
            "received_this_month": int(row.received_this_month or 0),
            "pending_cheques": int(row.pending_cheques or 0),
            "tx_count": int(row.tx_count or 0),
            "last_received_on": row.last_received_on,
        }
    )


def get_account(db: Session, account_id: int) -> Account:
    account = db.get(Account, account_id)
    if account is None:
        raise NotFoundError("account_not_found")
    return account


def list_accounts(db: Session) -> list[AccountOut]:
    return [_to_out(row) for row in db.execute(_with_totals())]


def account_detail(db: Session, account_id: int) -> AccountOut:
    row = db.execute(_with_totals().where(Account.id == account_id)).first()
    if row is None:
        raise NotFoundError("account_not_found")
    return _to_out(row)


def create_account(db: Session, data: AccountIn) -> AccountOut:
    account = Account(**data.model_dump())
    db.add(account)
    db.commit()
    return account_detail(db, account.id)


def update_account(db: Session, account_id: int, data: AccountPatch) -> AccountOut:
    account = get_account(db, account_id)
    apply_patch(
        account,
        data.model_dump(exclude_unset=True),
        required=("title", "kind", "color", "is_archived"),
    )
    db.commit()
    return account_detail(db, account_id)


def delete_account(db: Session, account_id: int) -> None:
    """Only an unused account can go; one with history is archived instead."""
    account = get_account(db, account_id)
    if db.scalar(select(func.count()).where(Transaction.account_id == account_id)):
        raise ConflictError("account_in_use")
    db.delete(account)
    db.commit()
