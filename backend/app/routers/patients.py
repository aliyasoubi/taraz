from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import DbSession
from app.models import Patient, Transaction, Treatment
from app.schemas import (
    PatientDetail,
    PatientIn,
    PatientOut,
    PatientPatch,
    TransactionOut,
    TreatmentIn,
    TreatmentOut,
    TreatmentPatch,
)
from app.services import ledger
from app.services.text import fold, tidy
from app.services.transactions import to_out, tx_select

router = APIRouter(tags=["patients"])

StatusFilter = Literal["all", "debtor", "creditor", "settled", "archived"]
SortKey = Literal["balance", "name", "recent"]


def _patient_or_404(db: Session, patient_id: int) -> Patient:
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "patient_not_found")
    return patient


def _patient_out(patient: Patient, totals: ledger.Totals | None) -> PatientOut:
    return PatientOut.model_validate(
        {**PatientOut.model_validate(patient).model_dump(), **(totals or ledger.Totals()).__dict__}
    )


@router.get("/patients", response_model=list[PatientOut])
def list_patients(
    db: DbSession,
    q: str = "",
    status_: Annotated[StatusFilter, Query(alias="status")] = "all",
    sort: SortKey = "balance",
    limit: Annotated[int, Query(le=2000)] = 500,
) -> list[PatientOut]:
    totals = ledger.totals_select(Transaction.patient_id).subquery()
    balance = func.coalesce(totals.c.balance, 0)

    stmt = select(Patient, totals).outerjoin(totals, totals.c.key == Patient.id)
    stmt = stmt.where(Patient.is_archived.is_(status_ == "archived"))
    if q.strip():
        for word in fold(q).split():
            stmt = stmt.where(Patient.name_search.contains(word, autoescape=True))
    if status_ == "debtor":
        stmt = stmt.where(balance > 0)
    elif status_ == "creditor":
        stmt = stmt.where(balance < 0)
    elif status_ == "settled":
        stmt = stmt.where(balance == 0)

    if sort == "name":
        stmt = stmt.order_by(Patient.name)
    elif sort == "recent":
        stmt = stmt.order_by(totals.c.last_activity.desc().nulls_last(), Patient.id.desc())
    else:
        stmt = stmt.order_by(balance.desc(), Patient.name)

    out = []
    for row in db.execute(stmt.limit(limit)):
        patient: Patient = row[0]
        t = ledger.Totals(
            balance=int(row.balance or 0),
            charged=int(row.charged or 0),
            paid=int(row.paid or 0),
            discounted=int(row.discounted or 0),
            pending_cheques=int(row.pending_cheques or 0),
            last_activity=row.last_activity,
            tx_count=int(row.tx_count or 0),
        )
        out.append(_patient_out(patient, t))
    return out


@router.post("/patients", response_model=PatientDetail, status_code=status.HTTP_201_CREATED)
def create_patient(body: PatientIn, db: DbSession) -> PatientDetail:
    name = tidy(body.name)
    patient = Patient(name=name, name_search=fold(name), phone=body.phone, note=body.note)
    db.add(patient)
    db.commit()
    return get_patient(patient.id, db)


@router.get("/patients/{patient_id}", response_model=PatientDetail)
def get_patient(patient_id: int, db: DbSession) -> PatientDetail:
    patient = _patient_or_404(db, patient_id)
    totals = ledger.patient_totals(db, [patient.id]).get(patient.id)
    treatments = db.scalars(
        select(Treatment).where(Treatment.patient_id == patient.id).order_by(Treatment.id)
    ).all()
    t_totals = ledger.treatment_totals(db, [t.id for t in treatments])
    return PatientDetail(
        **_patient_out(patient, totals).model_dump(),
        treatments=[
            TreatmentOut.model_validate(
                {
                    **TreatmentOut.model_validate(t).model_dump(),
                    **t_totals.get(t.id, ledger.Totals()).__dict__,
                }
            )
            for t in treatments
        ],
    )


@router.patch("/patients/{patient_id}", response_model=PatientDetail)
def update_patient(patient_id: int, body: PatientPatch, db: DbSession) -> PatientDetail:
    patient = _patient_or_404(db, patient_id)
    data = body.model_dump(exclude_unset=True)
    if data.get("name"):
        patient.name = tidy(data.pop("name"))
        patient.name_search = fold(patient.name)
    for key, value in data.items():
        if key == "is_archived" and value is None:
            continue
        setattr(patient, key, value)
    db.commit()
    return get_patient(patient.id, db)


@router.delete("/patients/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(patient_id: int, db: DbSession) -> None:
    db.delete(_patient_or_404(db, patient_id))
    db.commit()


@router.get("/patients/{patient_id}/transactions", response_model=list[TransactionOut])
def patient_transactions(patient_id: int, db: DbSession) -> list[TransactionOut]:
    _patient_or_404(db, patient_id)
    rows = db.scalars(
        tx_select()
        .where(Transaction.patient_id == patient_id)
        .order_by(Transaction.occurred_on.desc(), Transaction.id.desc())
    ).all()
    return [to_out(tx) for tx in rows]


# ── Treatments ─────────────────────────────────────────────────────────────


@router.post(
    "/patients/{patient_id}/treatments",
    response_model=TreatmentOut,
    status_code=status.HTTP_201_CREATED,
)
def create_treatment(patient_id: int, body: TreatmentIn, db: DbSession) -> TreatmentOut:
    _patient_or_404(db, patient_id)
    treatment = Treatment(patient_id=patient_id, **body.model_dump())
    db.add(treatment)
    db.commit()
    return TreatmentOut.model_validate(treatment)


@router.patch("/treatments/{treatment_id}", response_model=TreatmentOut)
def update_treatment(treatment_id: int, body: TreatmentPatch, db: DbSession) -> TreatmentOut:
    treatment = db.get(Treatment, treatment_id)
    if treatment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "treatment_not_found")
    for key, value in body.model_dump(exclude_unset=True).items():
        if value is None and key in ("title", "kind", "status"):
            continue
        setattr(treatment, key, value)
    db.commit()
    totals = ledger.treatment_totals(db, [treatment.id]).get(treatment.id, ledger.Totals())
    return TreatmentOut.model_validate(
        {**TreatmentOut.model_validate(treatment).model_dump(), **totals.__dict__}
    )


@router.delete("/treatments/{treatment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_treatment(treatment_id: int, db: DbSession) -> None:
    """Removes the case only; its transactions stay on the patient, unassigned."""
    treatment = db.get(Treatment, treatment_id)
    if treatment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "treatment_not_found")
    db.delete(treatment)
    db.commit()
