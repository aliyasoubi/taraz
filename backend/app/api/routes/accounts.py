from fastapi import APIRouter, status

from app.api.deps import DbSession
from app.schemas.accounts import AccountIn, AccountOut, AccountPatch
from app.services import accounts

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("", response_model=list[AccountOut])
def list_accounts(db: DbSession) -> list[AccountOut]:
    return accounts.list_accounts(db)


@router.get("/{account_id}", response_model=AccountOut)
def get_account(account_id: int, db: DbSession) -> AccountOut:
    return accounts.account_detail(db, account_id)


@router.post("", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
def create_account(body: AccountIn, db: DbSession) -> AccountOut:
    return accounts.create_account(db, body)


@router.patch("/{account_id}", response_model=AccountOut)
def update_account(account_id: int, body: AccountPatch, db: DbSession) -> AccountOut:
    return accounts.update_account(db, account_id, body)


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(account_id: int, db: DbSession) -> None:
    accounts.delete_account(db, account_id)
