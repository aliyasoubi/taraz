"""Excel exports: the month-end statement, and a full backup of every row."""

from collections.abc import Iterable, Sequence
from io import BytesIO
from typing import Any

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.worksheet import Worksheet
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Account,
    AccountKind,
    ChequeStatus,
    Patient,
    Transaction,
    Treatment,
    TreatmentKind,
    TxType,
)
from app.schemas import MonthlyReport
from app.services import ledger
from app.services.jalali import to_jalali_str
from app.services.reports import METHOD_LABELS
from app.services.transactions import tx_select

TYPE_LABELS = {
    TxType.CHARGE: "هزینه درمان",
    TxType.PAYMENT: "پرداخت",
    TxType.DISCOUNT: "تخفیف",
    TxType.REFUND: "استرداد",
}
CHEQUE_LABELS = {
    ChequeStatus.PENDING: "در انتظار وصول",
    ChequeStatus.CLEARED: "وصول شد",
    ChequeStatus.BOUNCED: "برگشتی",
}
ACCOUNT_KIND_LABELS = {
    AccountKind.OWN: "حساب شخصی",
    AccountKind.STAFF: "همکار / منشی",
    AccountKind.THIRD_PARTY: "شخص ثالث",
    AccountKind.POS: "کارتخوان",
    AccountKind.CASH: "صندوق نقدی",
    AccountKind.OTHER: "سایر",
}
TREATMENT_KIND_LABELS = {
    TreatmentKind.GENERAL: "عمومی",
    TreatmentKind.IMPLANT: "ایمپلنت",
    TreatmentKind.ORTHO: "ارتودنسی",
    TreatmentKind.LAMINATE: "لمینت",
    TreatmentKind.COMPOSITE: "کامپوزیت",
    TreatmentKind.ENDO: "عصب‌کشی",
    TreatmentKind.SURGERY: "جراحی",
    TreatmentKind.PROSTHESIS: "پروتز",
    TreatmentKind.COSMETIC: "زیبایی",
    TreatmentKind.OTHER: "سایر",
}

_HEADER_FILL = PatternFill("solid", fgColor="4C1D95")
_HEADER_FONT = Font(bold=True, color="FFFFFF")
_MONEY = "#,##0"


def _sheet(
    wb: Workbook,
    title: str,
    headers: Sequence[str],
    rows: Iterable[Sequence[Any]],
    money_cols: Iterable[int] = (),
) -> Worksheet:
    ws = wb.create_sheet(title)
    ws.sheet_view.rightToLeft = True
    ws.append(list(headers))
    for cell in ws[1]:
        cell.fill = _HEADER_FILL
        cell.font = _HEADER_FONT
        cell.alignment = Alignment(horizontal="center", vertical="center")
    for row in rows:
        ws.append(list(row))
    for col in money_cols:
        for (cell,) in ws.iter_rows(min_row=2, min_col=col, max_col=col):
            cell.number_format = _MONEY
    for idx, header in enumerate(headers, 1):
        width = max(
            [len(str(header))] + [len(str(c.value or "")) for c in ws[get_column_letter(idx)]]
        )
        ws.column_dimensions[get_column_letter(idx)].width = min(max(10, width + 3), 48)
    ws.freeze_panes = "A2"
    return ws


def _to_bytes(wb: Workbook) -> bytes:
    if "Sheet" in wb.sheetnames:
        del wb["Sheet"]
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _tx_rows(txs: Iterable[Transaction]) -> Iterable[list[Any]]:
    for tx in txs:
        yield [
            tx.id,
            to_jalali_str(tx.occurred_on),
            tx.patient.name,
            tx.treatment.title if tx.treatment else "",
            TYPE_LABELS[tx.type],
            tx.amount,
            tx.payer_name or ("خود بیمار" if tx.type == TxType.PAYMENT else ""),
            tx.account.title if tx.account else "",
            METHOD_LABELS.get(tx.method, "") if tx.method else "",
            tx.reference or "",
            to_jalali_str(tx.cheque_due_on),
            CHEQUE_LABELS.get(tx.cheque_status, "") if tx.cheque_status else "",
            tx.description or "",
        ]


TX_HEADERS = (
    "شناسه",
    "تاریخ",
    "بیمار",
    "پرونده",
    "نوع",
    "مبلغ (ریال)",
    "پرداخت‌کننده (مبدا)",
    "حساب مقصد",
    "روش",
    "شماره پیگیری / چک",
    "سررسید چک",
    "وضعیت چک",
    "توضیحات",
)


def monthly_xlsx(report: MonthlyReport) -> bytes:
    wb = Workbook()
    m = report.month
    _sheet(
        wb,
        "خلاصه",
        ("شرح", "مبلغ (ریال)"),
        [
            ("دوره", f"{m.label} ({to_jalali_str(m.start)} تا {to_jalali_str(m.end)})"),
            ("طلب ابتدای ماه", report.opening_receivable),
            ("هزینه‌های ثبت‌شده", report.charged),
            ("دریافتی‌ها", report.paid),
            ("تخفیف‌ها", report.discounted),
            ("استردادها", report.refunded),
            ("طلب پایان ماه", report.closing_receivable),
            ("بستانکاری بیماران (پیش‌پرداخت)", report.closing_credit),
            ("تعداد بدهکاران", report.debtors_count),
        ],
        money_cols=(2,),
    )
    _sheet(
        wb,
        "صورت‌حساب بیماران",
        (
            "بیمار",
            "مانده ابتدای ماه",
            "هزینه",
            "پرداخت",
            "تخفیف",
            "استرداد",
            "مانده پایان ماه",
            "چک در جریان",
        ),
        (
            (
                r.name,
                r.opening,
                r.charged,
                r.paid,
                r.discounted,
                r.refunded,
                r.closing,
                r.pending_cheques,
            )
            for r in report.rows
        ),
        money_cols=range(2, 9),
    )
    _sheet(
        wb,
        "واریز به حساب‌ها",
        ("حساب", "مبلغ (ریال)", "تعداد"),
        ((r.label, r.amount, r.count) for r in report.by_account),
        money_cols=(2,),
    )
    _sheet(
        wb,
        "روش پرداخت",
        ("روش", "مبلغ (ریال)", "تعداد"),
        ((r.label, r.amount, r.count) for r in report.by_method),
        money_cols=(2,),
    )
    _sheet(
        wb,
        "چک‌های سررسید",
        ("بیمار", "مبلغ (ریال)", "سررسید", "صادرکننده", "حساب", "وضعیت"),
        (
            (
                c.patient_name,
                c.amount,
                to_jalali_str(c.cheque_due_on),
                c.payer_name or "خود بیمار",
                c.account_title or "",
                CHEQUE_LABELS.get(c.cheque_status, "") if c.cheque_status else "",
            )
            for c in report.cheques_due
        ),
        money_cols=(2,),
    )
    return _to_bytes(wb)


def full_backup_xlsx(db: Session) -> bytes:
    wb = Workbook()
    totals = ledger.patient_totals(db)
    patients = db.scalars(select(Patient).order_by(Patient.name)).all()
    _sheet(
        wb,
        "بیماران",
        ("شناسه", "نام", "تلفن", "مانده (ریال)", "چک در جریان", "بایگانی", "یادداشت"),
        (
            (
                p.id,
                p.name,
                p.phone or "",
                totals[p.id].balance if p.id in totals else 0,
                totals[p.id].pending_cheques if p.id in totals else 0,
                "بله" if p.is_archived else "",
                p.note or "",
            )
            for p in patients
        ),
        money_cols=(4, 5),
    )
    txs = db.scalars(tx_select().order_by(Transaction.occurred_on, Transaction.id)).all()
    _sheet(wb, "تراکنش‌ها", TX_HEADERS, _tx_rows(txs), money_cols=(6,))
    treatments = db.scalars(select(Treatment).order_by(Treatment.patient_id, Treatment.id)).all()
    pnames = {p.id: p.name for p in patients}
    _sheet(
        wb,
        "پرونده‌ها",
        ("شناسه", "بیمار", "عنوان", "نوع", "پزشک", "وضعیت", "یادداشت"),
        (
            (
                t.id,
                pnames.get(t.patient_id, ""),
                t.title,
                TREATMENT_KIND_LABELS[t.kind],
                t.doctor or "",
                "پایان‌یافته" if t.status == "completed" else "فعال",
                t.note or "",
            )
            for t in treatments
        ),
    )
    accounts = db.scalars(select(Account).order_by(Account.id)).all()
    _sheet(
        wb,
        "حساب‌ها",
        ("شناسه", "عنوان", "صاحب حساب", "بانک", "نوع", "چهار رقم آخر", "بایگانی"),
        (
            (
                a.id,
                a.title,
                a.owner_name or "",
                a.bank or "",
                ACCOUNT_KIND_LABELS[a.kind],
                a.card_last4 or "",
                "بله" if a.is_archived else "",
            )
            for a in accounts
        ),
    )
    return _to_bytes(wb)
