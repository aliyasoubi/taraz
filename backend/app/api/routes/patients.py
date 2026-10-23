from typing import Annotated

from fastapi import APIRouter, Query, status

from app.api.deps import DbSession
from app.schemas.patients import PatientDetail, PatientIn, PatientOut, PatientPatch
from app.schemas.transactions import TransactionOut
from app.services import patients
from app.services.patients import SortKey, StatusFilter

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("", response_model=list[PatientOut])
def list_patients(
    db: DbSession,
    q: str = "",
    status_: Annotated[StatusFilter, Query(alias="status")] = "all",
    sort: SortKey = "balance",
    limit: Annotated[int, Query(le=2000)] = 500,
) -> list[PatientOut]:
    return patients.list_patients(db, q=q, status=status_, sort=sort, limit=limit)


@router.post("", response_model=PatientDetail, status_code=status.HTTP_201_CREATED)
def create_patient(body: PatientIn, db: DbSession) -> PatientDetail:
    return patients.create_patient(db, body)


@router.get("/{patient_id}", response_model=PatientDetail)
def get_patient(patient_id: int, db: DbSession) -> PatientDetail:
    return patients.patient_detail(db, patient_id)


@router.patch("/{patient_id}", response_model=PatientDetail)
def update_patient(patient_id: int, body: PatientPatch, db: DbSession) -> PatientDetail:
    return patients.update_patient(db, patient_id, body)


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(patient_id: int, db: DbSession) -> None:
    patients.delete_patient(db, patient_id)


@router.get("/{patient_id}/transactions", response_model=list[TransactionOut])
def patient_transactions(patient_id: int, db: DbSession) -> list[TransactionOut]:
    return patients.patient_transactions(db, patient_id)
