"""Stores a `StandardBook` in the database — all of it, or nothing."""

from dataclasses import dataclass
from itertools import cycle

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ConflictError
from app.core.i18n import t
from app.models import Account, AccountKind, Patient, Transaction, Treatment, TreatmentKind
from app.services import ledger
from app.services.legacy.cells import name_key
from app.services.transactions import has_transactions, normalize
from app.services.workbook.model import StandardBook
from app.utils.text import fold, tidy

_CARD_COLORS = ["violet", "sky", "emerald", "amber", "rose", "slate", "lime", "gold"]


@dataclass
class ImportSummary:
    patients: int
    accounts: int
    treatments: int
    transactions: int
    receivable: int
    credit: int
    pending_cheques: int


def _account_key(title: str) -> str:
    return fold(title).replace(" ", "")


class _Importer:
    def __init__(self, db: Session, book: StandardBook) -> None:
        self.db = db
        self.book = book
        self.merges = {name_key(p.name): p.merge_into for p in book.patients if p.merge_into}
        self.patients: dict[str, Patient] = {}
        self.accounts: dict[str, Account] = {}
        self.cases: dict[tuple[int, TreatmentKind], Treatment] = {}
        self.colors = cycle(_CARD_COLORS)
        # With --force the ledger already has rows: reuse its patients and accounts.
        for patient in db.scalars(select(Patient)):
            self.patients.setdefault(name_key(patient.name), patient)
        for account in db.scalars(select(Account)):
            self.accounts.setdefault(_account_key(account.title), account)
        for treatment in db.scalars(select(Treatment)):
            self.cases.setdefault((treatment.patient_id, treatment.kind), treatment)

    def account(
        self, title: str, kind: AccountKind = AccountKind.OTHER, **extra: str | None
    ) -> Account:
        key = _account_key(title)
        if key not in self.accounts:
            account = Account(title=tidy(title), kind=kind, color=next(self.colors), **extra)
            self.db.add(account)
            self.db.flush()
            self.accounts[key] = account
        return self.accounts[key]

    def patient(self, name: str) -> Patient:
        name = self.merges.get(name_key(name)) or name
        key = name_key(name)
        if key not in self.patients:
            patient = Patient(name=tidy(name), name_search=fold(name))
            self.db.add(patient)
            self.db.flush()
            self.patients[key] = patient
        return self.patients[key]

    def case(self, patient: Patient, kind: TreatmentKind, doctor: str | None) -> Treatment:
        if (patient.id, kind) not in self.cases:
            treatment = Treatment(
                patient_id=patient.id, kind=kind, title=t(f"treatment.{kind.value}"), doctor=doctor
            )
            self.db.add(treatment)
            self.db.flush()
            self.cases[(patient.id, kind)] = treatment
        return self.cases[(patient.id, kind)]

    def run(self) -> ImportSummary:
        for entry in self.book.accounts:
            self.account(entry.title, entry.kind, bank=entry.bank, owner_name=entry.owner)
        for line in self.book.lines:
            patient = self.patient(line.patient)
            treatment = self.case(patient, line.case, line.doctor) if line.case else None
            account = self.account(line.account) if line.account else None
            tx = Transaction(
                patient_id=patient.id,
                treatment_id=treatment.id if treatment else None,
                type=line.type,
                amount=line.amount,
                occurred_on=line.on,
                description=(" — ".join(x for x in (line.description, line.doctor) if x) or None),
                payer_name=line.payer,
                account_id=account.id if account else None,
                method=line.method,
                cheque_due_on=line.cheque_due,
                cheque_status=line.cheque_status,
            )
            normalize(tx)
            self.db.add(tx)
        self.db.flush()

        totals = list(ledger.patient_totals(self.db).values())
        return ImportSummary(
            patients=len(self.patients),
            accounts=len(self.accounts),
            treatments=len(self.cases),
            transactions=len(self.book.lines),
            receivable=sum(x.balance for x in totals if x.balance > 0),
            credit=-sum(x.balance for x in totals if x.balance < 0),
            pending_cheques=sum(x.pending_cheques for x in totals),
        )


def import_book(
    db: Session, book: StandardBook, *, dry_run: bool = False, force: bool = False
) -> ImportSummary:
    """Writes every row in one transaction.

    A dry run, or any error, leaves the database untouched.
    """
    if has_transactions(db) and not force:
        raise ConflictError("ledger_not_empty")
    try:
        summary = _Importer(db, book).run()
    except Exception:
        db.rollback()
        raise
    if dry_run:
        db.rollback()
    else:
        db.commit()
    return summary
