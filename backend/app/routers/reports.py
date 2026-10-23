from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Response, status

from app.db import DbSession
from app.schemas import Dashboard, MonthlyReport
from app.services import export, reports
from app.services.jalali import JMonth, today

router = APIRouter(tags=["reports"])

XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _month(year: int | None, month: int | None) -> JMonth:
    if year is None or month is None:
        return JMonth.of(today())
    if not 1 <= month <= 12 or not 1300 <= year <= 1500:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "ماه نامعتبر است")
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
    year: int | None = None,
    month: int | None = None,
) -> MonthlyReport:
    return reports.monthly(db, _month(year, month))


@router.get("/reports/monthly.xlsx")
def monthly_report_xlsx(
    db: DbSession,
    year: int | None = None,
    month: int | None = None,
) -> Response:
    m = _month(year, month)
    report = reports.monthly(db, m)
    return _xlsx(export.monthly_xlsx(report), f"taraz-{m.year}-{m.month:02d}.xlsx")


@router.get("/export/backup.xlsx")
def backup_xlsx(db: DbSession) -> Response:
    t = today()
    return _xlsx(export.full_backup_xlsx(db), f"taraz-backup-{t.isoformat()}.xlsx")
