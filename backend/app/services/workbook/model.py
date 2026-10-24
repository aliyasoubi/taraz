"""In-memory form of the standard workbook.

The legacy converter produces a `StandardBook`, the writer saves it as Excel for
review, the reader loads an edited copy back, and the importer stores it.
"""

from dataclasses import dataclass, field
from datetime import date

from app.models import AccountKind, ChequeStatus, PaymentMethod, TreatmentKind, TxType


@dataclass
class Line:
    """One ledger row: a charge, payment, discount or refund."""

    on: date
    patient: str
    type: TxType
    amount: int
    case: TreatmentKind | None = None
    payer: str | None = None
    account: str | None = None
    method: PaymentMethod | None = None
    cheque_due: date | None = None
    cheque_status: ChequeStatus | None = None
    doctor: str | None = None
    description: str | None = None
    source: str = ""
    review: str | None = None


@dataclass
class AccountEntry:
    title: str
    kind: AccountKind = AccountKind.OTHER
    bank: str | None = None
    owner: str | None = None
    aliases: set[str] = field(default_factory=set)
    uses: int = 0


@dataclass
class PatientEntry:
    name: str
    aliases: set[str] = field(default_factory=set)
    possible_duplicates: list[str] = field(default_factory=list)
    merge_into: str | None = None
    balance: int = 0
    pending_cheques: int = 0


@dataclass
class Issue:
    source: str
    patient: str
    text: str


@dataclass
class StandardBook:
    lines: list[Line] = field(default_factory=list)
    patients: list[PatientEntry] = field(default_factory=list)
    accounts: list[AccountEntry] = field(default_factory=list)
    issues: list[Issue] = field(default_factory=list)
