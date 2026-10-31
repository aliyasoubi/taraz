"""Ledger schema.

Every money movement is one row in `transactions`, scoped to a patient:

* ``charge``   — treatment cost; raises what the patient owes.
* ``payment``  — money received; lowers it. Carries the *source* (who actually
  paid — often not the patient) and the *destination* (which account received it).
* ``discount`` — forgiven amount; lowers it, no money moves.
* ``refund``   — money given back; raises it again.

A patient's balance is never stored, always derived, so it cannot drift from the
rows that justify it. Positive balance = the patient owes; negative = credit
(a deposit paid ahead of treatment).

A cheque payment counts only once it clears; until then it is tracked as
pending and the debt stays open — the same way the old spreadsheet listed
cheques under the debtors.

Amounts are integer rials. Display in toman is a frontend concern.
"""

from datetime import date, datetime
from enum import StrEnum

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


def _enum(cls: type[StrEnum], name: str) -> Enum:
    # Stored as VARCHAR + CHECK so adding a member later is a plain migration.
    return Enum(
        cls,
        name=name,
        native_enum=False,
        create_constraint=True,
        length=24,
        values_callable=lambda e: [m.value for m in e],
    )


class TxType(StrEnum):
    CHARGE = "charge"
    PAYMENT = "payment"
    DISCOUNT = "discount"
    REFUND = "refund"


class PaymentMethod(StrEnum):
    CARD = "card"  # card-to-card transfer
    TRANSFER = "transfer"  # bank transfer (Paya / Satna)
    POS = "pos"  # card terminal
    CASH = "cash"
    CHEQUE = "cheque"
    CURRENCY = "currency"  # foreign currency (dollars …)
    OTHER = "other"


class ChequeStatus(StrEnum):
    PENDING = "pending"
    CLEARED = "cleared"
    BOUNCED = "bounced"


class AccountKind(StrEnum):
    OWN = "own"  # my own account
    STAFF = "staff"  # receptionist / colleague
    THIRD_PARTY = "third_party"  # e.g. paid straight to a creditor of mine
    POS = "pos"
    CASH = "cash"
    OTHER = "other"


class TreatmentKind(StrEnum):
    GENERAL = "general"
    IMPLANT = "implant"
    ORTHO = "ortho"
    LAMINATE = "laminate"
    COMPOSITE = "composite"
    ENDO = "endo"
    SURGERY = "surgery"
    PROSTHESIS = "prosthesis"
    COSMETIC = "cosmetic"
    OTHER = "other"


class TreatmentStatus(StrEnum):
    ACTIVE = "active"
    COMPLETED = "completed"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class Patient(TimestampMixin, Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    # Arabic/Persian letter variants and ZWNJ folded away, for search.
    name_search: Mapped[str] = mapped_column(String(120), index=True)
    phone: Mapped[str | None] = mapped_column(String(32))
    note: Mapped[str | None] = mapped_column(Text)
    is_archived: Mapped[bool] = mapped_column(default=False)

    treatments: Mapped[list["Treatment"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan", passive_deletes=True
    )
    transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan", passive_deletes=True
    )


class Treatment(TimestampMixin, Base):
    """A treatment case — lets one patient carry separate balances,
    e.g. general work and an implant plan, as the old sheet did with `imp`."""

    __tablename__ = "treatments"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(120))
    kind: Mapped[TreatmentKind] = mapped_column(
        _enum(TreatmentKind, "treatment_kind"), default=TreatmentKind.GENERAL
    )
    doctor: Mapped[str | None] = mapped_column(String(80))
    status: Mapped[TreatmentStatus] = mapped_column(
        _enum(TreatmentStatus, "treatment_status"), default=TreatmentStatus.ACTIVE
    )
    note: Mapped[str | None] = mapped_column(Text)

    patient: Mapped[Patient] = relationship(back_populates="treatments")


class Account(TimestampMixin, Base):
    """Where a payment lands: a bank account/card, a POS terminal, cash, or a
    third party the patient was asked to pay directly."""

    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(80))
    owner_name: Mapped[str | None] = mapped_column(String(80))
    bank: Mapped[str | None] = mapped_column(String(40))
    kind: Mapped[AccountKind] = mapped_column(
        _enum(AccountKind, "account_kind"), default=AccountKind.OWN
    )
    card_last4: Mapped[str | None] = mapped_column(String(4))
    color: Mapped[str] = mapped_column(String(16), default="violet")
    note: Mapped[str | None] = mapped_column(Text)
    is_archived: Mapped[bool] = mapped_column(default=False)


class Transaction(TimestampMixin, Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_transactions_amount_positive"),
        Index("ix_transactions_patient_date", "patient_id", "occurred_on"),
        Index("ix_transactions_account_date", "account_id", "occurred_on"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"))
    treatment_id: Mapped[int | None] = mapped_column(
        ForeignKey("treatments.id", ondelete="SET NULL"), index=True
    )
    type: Mapped[TxType] = mapped_column(_enum(TxType, "tx_type"))
    amount: Mapped[int] = mapped_column(BigInteger)
    occurred_on: Mapped[date] = mapped_column(Date, index=True)
    description: Mapped[str | None] = mapped_column(
        String(300)
    )  # the service: implant, deposit, toothbrush…
    doctor: Mapped[str | None] = mapped_column(
        String(80)
    )  # the treating doctor, as the sheet records it

    # Payment / refund details — the "bank transfer" view of the row.
    payer_name: Mapped[str | None] = mapped_column(String(120))  # None = the patient
    account_id: Mapped[int | None] = mapped_column(ForeignKey("accounts.id", ondelete="RESTRICT"))
    method: Mapped[PaymentMethod | None] = mapped_column(_enum(PaymentMethod, "payment_method"))
    reference: Mapped[str | None] = mapped_column(String(64))  # tracking or cheque number

    cheque_due_on: Mapped[date | None] = mapped_column(Date, index=True)
    cheque_status: Mapped[ChequeStatus | None] = mapped_column(_enum(ChequeStatus, "cheque_status"))

    patient: Mapped[Patient] = relationship(back_populates="transactions")
    treatment: Mapped[Treatment | None] = relationship()
    account: Mapped[Account | None] = relationship()
