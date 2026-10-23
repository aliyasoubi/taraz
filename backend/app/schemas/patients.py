from datetime import datetime

from pydantic import BaseModel

from app.models import TreatmentKind, TreatmentStatus
from app.schemas.common import ORM, BalanceFields, OptStr32, OptStr80, OptText, Str120


class PatientIn(BaseModel):
    name: Str120
    phone: OptStr32 = None
    note: OptText = None


class PatientPatch(BaseModel):
    name: Str120 | None = None
    phone: OptStr32 = None
    note: OptText = None
    is_archived: bool | None = None


class PatientOut(ORM, BalanceFields):
    id: int
    name: str
    phone: str | None
    note: str | None
    is_archived: bool
    created_at: datetime


class TreatmentIn(BaseModel):
    title: Str120
    kind: TreatmentKind = TreatmentKind.GENERAL
    doctor: OptStr80 = None
    status: TreatmentStatus = TreatmentStatus.ACTIVE
    note: OptText = None


class TreatmentPatch(BaseModel):
    title: Str120 | None = None
    kind: TreatmentKind | None = None
    doctor: OptStr80 = None
    status: TreatmentStatus | None = None
    note: OptText = None


class TreatmentOut(ORM, BalanceFields):
    id: int
    patient_id: int
    title: str
    kind: TreatmentKind
    doctor: str | None
    status: TreatmentStatus
    note: str | None
    created_at: datetime


class PatientDetail(PatientOut):
    treatments: list[TreatmentOut]
