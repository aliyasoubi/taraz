from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, Query, Response

from app.api.deps import DbSession
from app.schemas.reports import Dashboard, MonthlyReport, MonthSheet
from app.services import export, reports
from app.utils.jalali import JMonth, today

router = APIRouter(tags=["reports"])

XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


Year = Annotated[int | None, Query(ge=1300, le=1500)]
Month = Annotated[int | None, Query(ge=1, le=12)]


def _month(year: int | None, month: int | None) -> JMonth:
    """The requested Jalali month, or the current one when none is given."""
    if year is None or month is None:
        return JMonth.of(today())
    return JMonth(year, month)


def _xlsx(content: bytes, filename: str) -> Response:
    return Response(
        content,
        media_type=XLSX,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}",
            "Cache-Control": "no-store",
        },
    )


@router.get("/dashboard", response_model=Dashboard)
def get_dashboard(db: DbSession) -> Dashboard:
    return reports.dashboard(db)


@router.get("/reports/monthly", response_model=MonthlyReport)
def monthly_report(
    db: DbSession,
    year: Year = None,
    month: Month = None,
) -> MonthlyReport:
    return reports.monthly(db, _month(year, month))


@router.get("/reports/monthly.xlsx")
def monthly_report_xlsx(
    db: DbSession,
    year: Year = None,
    month: Month = None,
) -> Response:
    m = _month(year, month)
    report = reports.monthly(db, m)
    return _xlsx(export.monthly_xlsx(report), f"taraz-{m.year}-{m.month:02d}.xlsx")


@router.get("/reports/month-sheet", response_model=MonthSheet)
def month_sheet(db: DbSession, year: Year = None, month: Month = None) -> MonthSheet:
    return reports.month_sheet(db, _month(year, month))


@router.get("/reports/month-sheet.xlsx")
def month_sheet_xlsx(db: DbSession, year: Year = None, month: Month = None) -> Response:
    m = _month(year, month)
    sheet = reports.month_sheet(db, m)
    return _xlsx(export.month_sheet_xlsx(sheet), f"taraz-sheet-{m.year}-{m.month:02d}.xlsx")


@router.get("/export/backup.xlsx")
def backup_xlsx(db: DbSession) -> Response:
    t = today()
    return _xlsx(export.full_backup_xlsx(db), f"taraz-backup-{t.isoformat()}.xlsx")
