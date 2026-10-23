from datetime import date, timedelta

from sqlalchemy import ColumnElement, and_, func, or_, select
from sqlalchemy.orm import Session

from app.models import Account, ChequeStatus, Patient, PaymentMethod, Transaction, TxType
from app.schemas import (
    BreakdownRow,
    Dashboard,
    DebtorRow,
    MonthlyReport,
    MonthRef,
    SeriesPoint,
    StatementRow,
)
from app.services import ledger
from app.services.jalali import JMonth, today
from app.services.transactions import to_out, tx_select

T = Transaction

METHOD_LABELS = {
    PaymentMethod.CARD: "کارت به کارت",
    PaymentMethod.TRANSFER: "انتقال بانکی",
    PaymentMethod.POS: "کارتخوان",
    PaymentMethod.CASH: "نقد",
    PaymentMethod.CHEQUE: "چک",
    PaymentMethod.CURRENCY: "ارز",
    PaymentMethod.OTHER: "سایر",
}


def month_ref(m: JMonth) -> MonthRef:
    return MonthRef(year=m.year, month=m.month, label=m.label, start=m.start, end=m.end)


def _between(start: date, end: date) -> ColumnElement[bool]:
    return and_(ledger.effective_on >= start, ledger.effective_on <= end)


def _received(db: Session, start: date, end: date) -> int:
    cond = and_(ledger.counts_as_paid, _between(start, end))
    return int(db.scalar(select(ledger.sum_where(cond))) or 0)


def _charged(db: Session, start: date, end: date) -> int:
    cond = and_(T.type == TxType.CHARGE, _between(start, end))
    return int(db.scalar(select(ledger.sum_where(cond))) or 0)


def dashboard(db: Session) -> Dashboard:
    now = today()
    month = JMonth.of(now)
    balances = ledger.patient_totals(db)
    active_ids = set(db.scalars(select(Patient.id).where(Patient.is_archived.is_(False))).all())

    debtors = sorted(
        ((pid, t) for pid, t in balances.items() if t.balance > 0),
        key=lambda item: item[1].balance,
        reverse=True,
    )
    names = dict(
        db.execute(
            select(Patient.id, Patient.name).where(Patient.id.in_([d[0] for d in debtors[:5]]))
        ).all()
    )

    series = []
    m = month
    for _ in range(6):
        series.append(
            SeriesPoint(
                year=m.year,
                month=m.month,
                label=m.label,
                received=_received(db, m.start, m.end),
                charged=_charged(db, m.start, m.end),
            )
        )
        m = m.prev()
    series.reverse()

    pending_total, pending_count = db.execute(
        select(func.coalesce(func.sum(T.amount), 0), func.count(T.id)).where(
            ledger.is_pending_cheque
        )
    ).one()
    upcoming = db.scalars(
        tx_select()
        .where(ledger.is_pending_cheque)
        .order_by(T.cheque_due_on.asc().nulls_last())
        .limit(6)
    ).all()
    recent = db.scalars(tx_select().order_by(T.id.desc()).limit(8)).all()

    return Dashboard(
        month=month_ref(month),
        receivable=sum(t.balance for t in balances.values() if t.balance > 0),
        credit=-sum(t.balance for t in balances.values() if t.balance < 0),
        debtors_count=len(debtors),
        patients_count=len(active_ids),
        received_this_month=series[-1].received,
        charged_this_month=series[-1].charged,
        received_today=_received(db, now, now),
        pending_cheques_total=int(pending_total),
        pending_cheques_count=int(pending_count),
        series=series,
        top_debtors=[
            DebtorRow(
                id=pid,
                name=names.get(pid, ""),
                balance=t.balance,
                pending_cheques=t.pending_cheques,
                last_activity=t.last_activity,
            )
            for pid, t in debtors[:5]
        ],
        upcoming_cheques=[to_out(tx) for tx in upcoming],
        recent=[to_out(tx) for tx in recent],
    )


def monthly(db: Session, month: JMonth) -> MonthlyReport:
    start, end = month.start, month.end
    opening = ledger.patient_totals(db, as_of=start - timedelta(days=1))
    closing = ledger.patient_totals(db, as_of=end)
    in_period = _between(start, end)

    # A cheque that was still in hand at month end: pending now, or cleared after `end`.
    cheque_in_hand = and_(
        T.type == TxType.PAYMENT,
        ledger.is_cheque,
        T.occurred_on <= end,
        or_(
            T.cheque_status == ChequeStatus.PENDING,
            and_(T.cheque_status == ChequeStatus.CLEARED, ledger.effective_on > end),
        ),
    )
    activity = {
        row.patient_id: row
        for row in db.execute(
            select(
                T.patient_id,
                ledger.sum_where(and_(T.type == TxType.CHARGE, in_period)).label("charged"),
                ledger.sum_where(and_(ledger.counts_as_paid, in_period)).label("paid"),
                ledger.sum_where(and_(T.type == TxType.DISCOUNT, in_period)).label("discounted"),
                ledger.sum_where(and_(T.type == TxType.REFUND, in_period)).label("refunded"),
                ledger.sum_where(cheque_in_hand).label("pending_cheques"),
            ).group_by(T.patient_id)
        )
    }

    ids = set(opening) | set(closing)
    names = dict(db.execute(select(Patient.id, Patient.name).where(Patient.id.in_(ids))).all())
    rows: list[StatementRow] = []
    for pid in ids:
        a = activity.get(pid)
        row = StatementRow(
            id=pid,
            name=names.get(pid, ""),
            opening=opening[pid].balance if pid in opening else 0,
            closing=closing[pid].balance if pid in closing else 0,
            charged=int(a.charged) if a else 0,
            paid=int(a.paid) if a else 0,
            discounted=int(a.discounted) if a else 0,
            refunded=int(a.refunded) if a else 0,
            pending_cheques=int(a.pending_cheques) if a else 0,
        )
        if row.opening or row.closing or row.charged or row.paid or row.discounted or row.refunded:
            rows.append(row)
    rows.sort(key=lambda r: (-r.closing, r.name))

    account_rows = db.execute(
        select(T.account_id, Account.title, Account.color, func.sum(T.amount), func.count(T.id))
        .outerjoin(Account, Account.id == T.account_id)
        .where(ledger.counts_as_paid, in_period)
        .group_by(T.account_id, Account.title, Account.color)
        .order_by(func.sum(T.amount).desc())
    ).all()
    method_rows = db.execute(
        select(T.method, func.sum(T.amount), func.count(T.id))
        .where(ledger.counts_as_paid, in_period)
        .group_by(T.method)
        .order_by(func.sum(T.amount).desc())
    ).all()
    cheques_due = db.scalars(
        tx_select()
        .where(T.type == TxType.PAYMENT, ledger.is_cheque, T.cheque_due_on.between(start, end))
        .order_by(T.cheque_due_on, T.id)
    ).all()

    return MonthlyReport(
        month=month_ref(month),
        opening_receivable=sum(r.opening for r in rows if r.opening > 0),
        closing_receivable=sum(r.closing for r in rows if r.closing > 0),
        closing_credit=-sum(r.closing for r in rows if r.closing < 0),
        charged=sum(r.charged for r in rows),
        paid=sum(r.paid for r in rows),
        discounted=sum(r.discounted for r in rows),
        refunded=sum(r.refunded for r in rows),
        debtors_count=sum(1 for r in rows if r.closing > 0),
        by_account=[
            BreakdownRow(
                key=str(acc_id or 0),
                label=title or "حساب نامشخص",
                amount=int(amount),
                count=int(count),
                color=color,
            )
            for acc_id, title, color, amount, count in account_rows
        ],
        by_method=[
            BreakdownRow(
                key=method.value if method else "unknown",
                label=METHOD_LABELS.get(method, "نامشخص") if method else "نامشخص",
                amount=int(amount),
                count=int(count),
            )
            for method, amount, count in method_rows
        ],
        rows=rows,
        cheques_due=[to_out(tx) for tx in cheques_due],
    )
