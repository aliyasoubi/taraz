"""Import one month sheet on top of the months already in the app."""

from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path
from typing import IO

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import ConflictError
from app.models import Patient, Transaction
from app.services import ledger
from app.services.spreadsheet.cells import name_key
from app.services.spreadsheet.convert import convert_month, pick_month_sheet
from app.services.workbook.importer import ImportSummary, import_book
from app.services.workbook.model import StandardBook
from app.utils.jalali import JMonth


@dataclass
class MonthImport:
    month: JMonth
    book: StandardBook
    summary: ImportSummary


def opening_balances(db: Session, month: JMonth) -> dict[str, int]:
    """What each patient owes on the eve of `month`, keyed like the sheet's names."""
    totals = ledger.patient_totals(db, as_of=month.start - timedelta(days=1))
    names = {patient_id: name for patient_id, name in db.execute(select(Patient.id, Patient.name))}
    opening: dict[str, int] = {}
    for patient_id, total in totals.items():
        key = name_key(names[patient_id])
        opening[key] = opening.get(key, 0) + total.balance
    return opening


def entries_in(db: Session, month: JMonth) -> int:
    return int(
        db.scalar(
            select(func.count(Transaction.id)).where(
                Transaction.occurred_on.between(month.start, month.end)
            )
        )
        or 0
    )


def import_month(
    db: Session,
    source: Path | IO[bytes],
    month: JMonth | None = None,
    *,
    dry_run: bool = False,
    replace: bool = False,
    force: bool = False,
) -> MonthImport:
    """Each patient continues from their balance in the app; `replace` starts the ledger afresh.

    Refuses a month that already has entries (importing it twice would count it
    twice) unless `force`.
    """
    _, found = pick_month_sheet(source, month)
    if not isinstance(source, Path):
        source.seek(0)
    if not (replace or force) and entries_in(db, found):
        raise ConflictError("month_not_empty")
    opening = {} if replace else opening_balances(db, found)
    book, _ = convert_month(source, found, opening=opening)
    summary = import_book(db, book, dry_run=dry_run, force=True, replace=replace)
    return MonthImport(found, book, summary)
