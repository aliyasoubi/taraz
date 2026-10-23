"""Shared field types and base models for the API schemas."""

from datetime import date
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, StringConstraints


def _blank_to_none(v: object) -> object:
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


# Blank strings from a cleared form field mean "no value".
_Blank = BeforeValidator(_blank_to_none)

Str80 = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
Str120 = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
OptStr32 = Annotated[Annotated[str, StringConstraints(max_length=32)] | None, _Blank]
OptStr40 = Annotated[Annotated[str, StringConstraints(max_length=40)] | None, _Blank]
OptStr64 = Annotated[Annotated[str, StringConstraints(max_length=64)] | None, _Blank]
OptStr80 = Annotated[Annotated[str, StringConstraints(max_length=80)] | None, _Blank]
OptStr120 = Annotated[Annotated[str, StringConstraints(max_length=120)] | None, _Blank]
OptStr300 = Annotated[Annotated[str, StringConstraints(max_length=300)] | None, _Blank]
OptText = Annotated[Annotated[str, StringConstraints(max_length=2000)] | None, _Blank]
Last4 = Annotated[Annotated[str, Field(pattern=r"^\d{4}$")] | None, _Blank]
ColorKey = Annotated[str, Field(pattern=r"^[a-z]{3,16}$")]


# Rials. The ceiling is far above any real bill and keeps a mistyped run of zeros out.
Amount = Annotated[int, Field(gt=0, le=10**14)]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class BalanceFields(BaseModel):
    balance: int = 0
    charged: int = 0
    paid: int = 0
    discounted: int = 0
    pending_cheques: int = 0
    last_activity: date | None = None
    tx_count: int = 0
