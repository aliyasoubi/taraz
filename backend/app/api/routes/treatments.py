from fastapi import APIRouter, status

from app.api.deps import DbSession
from app.schemas.patients import TreatmentIn, TreatmentOut, TreatmentPatch
from app.services import patients

router = APIRouter(tags=["treatments"])


@router.post(
    "/patients/{patient_id}/treatments",
    response_model=TreatmentOut,
    status_code=status.HTTP_201_CREATED,
)
def create_treatment(patient_id: int, body: TreatmentIn, db: DbSession) -> TreatmentOut:
    return patients.create_treatment(db, patient_id, body)


@router.patch("/treatments/{treatment_id}", response_model=TreatmentOut)
def update_treatment(treatment_id: int, body: TreatmentPatch, db: DbSession) -> TreatmentOut:
    return patients.update_treatment(db, treatment_id, body)


@router.delete("/treatments/{treatment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_treatment(treatment_id: int, db: DbSession) -> None:
    patients.delete_treatment(db, treatment_id)
