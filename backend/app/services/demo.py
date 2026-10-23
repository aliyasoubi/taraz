"""Fake data for trying the UI. Names and labels come from the locale file."""

import random
from datetime import date, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.core.errors import ConflictError
from app.core.i18n import t
from app.models import (
    Account,
    AccountKind,
    ChequeStatus,
    Patient,
    PaymentMethod,
    Transaction,
    Treatment,
    TreatmentKind,
    TxType,
)
from app.services.importer import has_transactions
from app.utils.jalali import today
from app.utils.text import fold

PATIENTS = 18
CASE_KINDS = [
    TreatmentKind.GENERAL,
    TreatmentKind.IMPLANT,
    TreatmentKind.ORTHO,
    TreatmentKind.LAMINATE,
]
PAY_METHODS = [PaymentMethod.CARD, PaymentMethod.POS, PaymentMethod.TRANSFER]
PLAN_SIZES = [45, 120, 380, 900, 1500, 2600]  # × 10M rials
INSTALMENTS = [5, 10, 15, 30, 50]  # × 10M rials
CHEQUE_SHARE = 0.15


def seed_demo(db: Session, seed: int = 1405) -> None:
    """Fill an empty ledger; refuses to touch one that already has rows."""
    if has_transactions(db):
        raise ConflictError("ledger_not_empty")
    rng = random.Random(seed)
    demo: dict[str, Any] = t("demo")

    accounts = [Account(**{**a, "kind": AccountKind(a["kind"])}) for a in demo["accounts"]]
    db.add_all(accounts)
    db.flush()

    pairs = [f"{first} {last}" for first in demo["firstNames"] for last in demo["lastNames"]]
    for name in rng.sample(pairs, PATIENTS):
        _seed_patient(db, rng, demo, accounts, name, today())
    db.commit()


def _seed_patient(
    db: Session,
    rng: random.Random,
    demo: dict[str, Any],
    accounts: list[Account],
    name: str,
    now: date,
) -> None:
    patient = Patient(
        name=name, name_search=fold(name), phone=f"0912{rng.randint(10**6, 10**7 - 1)}"
    )
    db.add(patient)
    db.flush()
    kind = rng.choice(CASE_KINDS)
    case = Treatment(
        patient_id=patient.id,
        title=demo["caseTitles"][kind],
        kind=kind,
        doctor=rng.choice([*demo["doctors"], None]),
    )
    db.add(case)
    db.flush()

    total = rng.choice(PLAN_SIZES) * 10_000_000
    start = now - timedelta(days=rng.randint(20, 150))
    db.add(
        Transaction(
            patient_id=patient.id,
            treatment_id=case.id,
            type=TxType.CHARGE,
            amount=total,
            occurred_on=start,
            description=demo["planNote"],
        )
    )

    paid = 0
    for _ in range(rng.randint(0, 4)):
        amount = rng.choice(INSTALMENTS) * 10_000_000
        if paid + amount > total:
            break
        paid += amount
        day = start + timedelta(days=rng.randint(0, (now - start).days))
        cheque = rng.random() < CHEQUE_SHARE
        db.add(
            Transaction(
                patient_id=patient.id,
                treatment_id=case.id,
                type=TxType.PAYMENT,
                amount=amount,
                occurred_on=day,
                payer_name=rng.choice([None, None, None, *demo["payers"]]),
                account_id=rng.choice(accounts).id,
                method=PaymentMethod.CHEQUE if cheque else rng.choice(PAY_METHODS),
                cheque_due_on=day + timedelta(days=rng.randint(10, 60)) if cheque else None,
                cheque_status=ChequeStatus.PENDING if cheque else None,
            )
        )
