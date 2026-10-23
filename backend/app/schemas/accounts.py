from datetime import date

from pydantic import BaseModel

from app.models import AccountKind
from app.schemas.common import ORM, ColorKey, Last4, OptStr40, OptStr80, OptText, Str80


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
