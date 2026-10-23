"""Patients and their treatment cases."""

from dataclasses import asdict
from typing import Any, Literal

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models import Patient, Transaction, Treatment
from app.schemas.patients import (
    PatientDetail,
    PatientIn,
    PatientOut,
    PatientPatch,
    TreatmentIn,
    TreatmentOut,
    TreatmentPatch,
)
from app.schemas.transactions import TransactionOut
from app.services import ledger
from app.services.transactions import tx_select, tx_to_out
from app.utils.patching import apply_patch
from app.utils.text import fold, tidy

StatusFilter = Literal["all", "debtor", "creditor", "settled", "archived"]
SortKey = Literal["balance", "name", "recent"]


# ── Mapping ────────────────────────────────────────────────────────────────


def patient_out(patient: Patient, totals: ledger.Totals | None = None) -> PatientOut:
    return PatientOut.model_validate(
        {**PatientOut.model_validate(patient).model_dump(), **asdict(totals or ledger.Totals())}
    )


def treatment_out(treatment: Treatment, totals: ledger.Totals | None = None) -> TreatmentOut:
    return TreatmentOut.model_validate(
        {**TreatmentOut.model_validate(treatment).model_dump(), **asdict(totals or ledger.Totals())}
    )


# ── Patients ───────────────────────────────────────────────────────────────


def get_patient(db: Session, patient_id: int) -> Patient:
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise NotFoundError("patient_not_found")
    return patient


def _list_query(q: str, status: StatusFilter, sort: SortKey) -> Select[Any]:
    totals = ledger.totals_select(Transaction.patient_id).subquery()
    balance = func.coalesce(totals.c.balance, 0)

    stmt = select(Patient, totals).outerjoin(totals, totals.c.key == Patient.id)
    stmt = stmt.where(Patient.is_archived.is_(status == "archived"))
    for word in fold(q).split():
        stmt = stmt.where(Patient.name_search.contains(word, autoescape=True))

    if status == "debtor":
        stmt = stmt.where(balance > 0)
    elif status == "creditor":
        stmt = stmt.where(balance < 0)
    elif status == "settled":
        stmt = stmt.where(balance == 0)

    if sort == "name":
        return stmt.order_by(Patient.name)
    if sort == "recent":
        return stmt.order_by(totals.c.last_activity.desc().nulls_last(), Patient.id.desc())
    return stmt.order_by(balance.desc(), Patient.name)


def list_patients(
    db: Session,
    q: str = "",
    status: StatusFilter = "all",
    sort: SortKey = "balance",
    limit: int = 500,
) -> list[PatientOut]:
    rows = db.execute(_list_query(q, status, sort).limit(limit))
    return [patient_out(row[0], ledger.Totals.from_row(row)) for row in rows]


def patient_detail(db: Session, patient_id: int) -> PatientDetail:
    patient = get_patient(db, patient_id)
    treatments = db.scalars(
        select(Treatment).where(Treatment.patient_id == patient.id).order_by(Treatment.id)
    ).all()
    case_totals = ledger.treatment_totals(db, [tr.id for tr in treatments])
    return PatientDetail(
        **patient_out(
            patient, ledger.patient_totals(db, [patient.id]).get(patient.id)
        ).model_dump(),
        treatments=[treatment_out(tr, case_totals.get(tr.id)) for tr in treatments],
    )


def create_patient(db: Session, data: PatientIn) -> PatientDetail:
    name = tidy(data.name)
    patient = Patient(name=name, name_search=fold(name), phone=data.phone, note=data.note)
    db.add(patient)
    db.commit()
    return patient_detail(db, patient.id)


def update_patient(db: Session, patient_id: int, data: PatientPatch) -> PatientDetail:
    patient = get_patient(db, patient_id)
    changes = data.model_dump(exclude_unset=True)
    if name := changes.pop("name", None):
        patient.name = tidy(name)
        patient.name_search = fold(patient.name)
    apply_patch(patient, changes, required=("is_archived",))
    db.commit()
    return patient_detail(db, patient.id)


def delete_patient(db: Session, patient_id: int) -> None:
    """Removes the patient together with their whole ledger."""
    db.delete(get_patient(db, patient_id))
    db.commit()


def patient_transactions(db: Session, patient_id: int) -> list[TransactionOut]:
    get_patient(db, patient_id)
    rows = db.scalars(
        tx_select()
        .where(Transaction.patient_id == patient_id)
        .order_by(Transaction.occurred_on.desc(), Transaction.id.desc())
    ).all()
    return [tx_to_out(tx) for tx in rows]


# ── Treatment cases ────────────────────────────────────────────────────────


def get_treatment(db: Session, treatment_id: int) -> Treatment:
    treatment = db.get(Treatment, treatment_id)
    if treatment is None:
        raise NotFoundError("treatment_not_found")
    return treatment


def create_treatment(db: Session, patient_id: int, data: TreatmentIn) -> TreatmentOut:
    get_patient(db, patient_id)
    treatment = Treatment(patient_id=patient_id, **data.model_dump())
    db.add(treatment)
    db.commit()
    return treatment_out(treatment)


def update_treatment(db: Session, treatment_id: int, data: TreatmentPatch) -> TreatmentOut:
    treatment = get_treatment(db, treatment_id)
    apply_patch(
        treatment, data.model_dump(exclude_unset=True), required=("title", "kind", "status")
    )
    db.commit()
    return treatment_out(treatment, ledger.treatment_totals(db, [treatment.id]).get(treatment.id))


def delete_treatment(db: Session, treatment_id: int) -> None:
    """Removes the case only; its transactions stay on the patient, unassigned."""
    db.delete(get_treatment(db, treatment_id))
    db.commit()
