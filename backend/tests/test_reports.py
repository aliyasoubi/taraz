from io import BytesIO
from pathlib import Path

from openpyxl import Workbook, load_workbook

from app.db import SessionLocal
from app.services import importer
from app.services.jalali import JMonth, parse_jalali
from tests.conftest import Api

# Mehr 1405 = 2026-09-23 … 2026-10-22; Aban 1405 starts 2026-10-23.
MEHR = JMonth(1405, 7)


def test_jalali_month_boundaries() -> None:
    assert (MEHR.start.isoformat(), MEHR.end.isoformat()) == ("2026-09-23", "2026-10-22")
    assert JMonth(1405, 12).next() == JMonth(1406, 1)
    assert parse_jalali("1405,04,30") == parse_jalali("1405/4/30")
    assert parse_jalali("1405-067-07") is None


def test_month_end_statement(api: Api) -> None:
    pid = api.patient("بیمار ماهانه")
    acc = api.account("بلو", color="sky")
    api.tx(pid, "charge", 1_000, on="2026-09-10")  # Shahrivar → opening balance
    api.tx(pid, "charge", 500, on="2026-10-01")
    api.tx(pid, "payment", 300, on="2026-10-05", account_id=acc, method="card")
    api.tx(pid, "payment", 100, on="2026-10-23", method="cash")  # Aban — outside the month
    # Received in Mehr but due in Aban: still in hand at month end.
    api.tx(pid, "payment", 200, on="2026-10-10", method="cheque", cheque_due_on="2026-11-05")

    r = api.c.get("/api/reports/monthly", params={"year": 1405, "month": 7}).json()
    assert r["month"]["label"] == "مهر 1405"
    (row,) = r["rows"]
    assert (row["opening"], row["charged"], row["paid"], row["closing"]) == (1_000, 500, 300, 1_200)
    assert row["pending_cheques"] == 200
    assert (r["opening_receivable"], r["closing_receivable"], r["debtors_count"]) == (
        1_000,
        1_200,
        1,
    )
    assert [(a["label"], a["amount"]) for a in r["by_account"]] == [("بلو", 300)]
    assert r["cheques_due"] == []


def test_cleared_cheque_lands_on_its_due_date(api: Api) -> None:
    pid = api.patient()
    api.tx(pid, "charge", 1_000, on="2026-09-25")
    cheque = api.tx(
        pid, "payment", 400, on="2026-09-30", method="cheque", cheque_due_on="2026-10-28"
    )
    api.c.patch(f"/api/transactions/{cheque['id']}", json={"cheque_status": "cleared"})

    mehr = api.c.get("/api/reports/monthly", params={"year": 1405, "month": 7}).json()
    aban = api.c.get("/api/reports/monthly", params={"year": 1405, "month": 8}).json()
    assert mehr["rows"][0]["closing"] == 1_000 and mehr["paid"] == 0
    assert aban["rows"][0]["closing"] == 600 and aban["paid"] == 400
    assert [c["id"] for c in aban["cheques_due"]] == [cheque["id"]]


def test_monthly_report_rejects_bad_month(api: Api) -> None:
    assert api.c.get("/api/reports/monthly", params={"year": 1405, "month": 13}).status_code == 422


def test_dashboard(api: Api) -> None:
    a, b = api.patient("الف"), api.patient("ب")
    api.tx(a, "charge", 700)
    api.tx(b, "payment", 50, method="cash")
    api.tx(a, "payment", 100, method="cheque", cheque_due_on="2026-12-01")
    d = api.c.get("/api/dashboard").json()
    assert (d["receivable"], d["credit"], d["debtors_count"]) == (700, 50, 1)
    assert (d["pending_cheques_total"], d["pending_cheques_count"]) == (100, 1)
    assert len(d["series"]) == 6
    assert d["top_debtors"][0]["name"] == "الف"


def test_excel_exports(api: Api) -> None:
    pid = api.patient()
    api.tx(pid, "charge", 1_000, on="2026-10-01")
    r = api.c.get("/api/reports/monthly.xlsx", params={"year": 1405, "month": 7})
    assert r.status_code == 200
    wb = load_workbook(BytesIO(r.content))
    assert wb.sheetnames[:2] == ["خلاصه", "صورت‌حساب بیماران"]
    assert wb["صورت‌حساب بیماران"].sheet_view.rightToLeft

    backup = load_workbook(BytesIO(api.c.get("/api/export/backup.xlsx").content))
    assert backup["تراکنش‌ها"].max_row == 2


def test_import_debtors_sheet(tmp_path: Path, api: Api) -> None:
    wb = Workbook()
    ws = wb.active
    ws.title = importer.SHEET
    ws.append(["اسم بیمار", "مانده حساب", "تاریخ", "بانک - حساب", "توضیحات"])
    ws.append(["بیمار یک", 100, None, None, None])
    ws.append(["بیمار یک imp", 900, None, None, None])
    ws.append(["بیمار. دو", 650, "1405-08-25", "چک فروهر", None])
    ws.append(["بیمار دو", 650, "1405-09-25", "چک", None])
    ws.append(["بیمار سه", "?", None, None, None])
    ws.append(["بیمار چهار", 2000, "چک", None, None])
    path = tmp_path / "old.xlsx"
    wb.save(path)

    with SessionLocal() as db:
        result = importer.run(db, path, parse_jalali("1405-08-01"))  # type: ignore[arg-type]
    assert (result.patients_created, result.charges, result.cheques) == (3, 5, 3)
    assert result.skipped and result.skipped[0][0] == 6

    patients = {p["name"]: p for p in api.c.get("/api/patients").json()}
    one, two = patients["بیمار یک"], patients["بیمار دو"]
    assert one["balance"] == 1_000
    assert [t["kind"] for t in api.balance(one["id"])["treatments"]] == ["implant"]
    assert (two["balance"], two["pending_cheques"]) == (1_300, 1_300)
    cheques = api.c.get(
        "/api/transactions", params={"patient_id": two["id"], "type": "payment"}
    ).json()
    assert sorted(c["payer_name"] or "" for c in cheques["items"]) == ["", "فروهر"]


def test_sqlite_backup_is_readable_and_pruned(tmp_path: Path, api: Api) -> None:
    from app.cli import backup_sqlite
    from app.config import get_settings

    api.patient("پشتیبان")
    db_path = Path(get_settings().database_url.removeprefix("sqlite:///"))
    for _ in range(3):
        last = backup_sqlite(db_path, tmp_path, keep=2)
    import sqlite3

    assert len(list(tmp_path.glob("taraz-*.db"))) <= 2
    with sqlite3.connect(last) as conn:
        assert conn.execute("select name from patients").fetchall() == [("پشتیبان",)]
