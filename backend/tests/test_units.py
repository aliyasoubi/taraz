"""Pure business rules, tested without a database or HTTP."""

from datetime import date
from types import SimpleNamespace

from app.models import ChequeStatus, PaymentMethod, Transaction, TxType
from app.services.transactions import TransactionFilter, counts, normalize
from app.utils.patching import apply_patch


def _tx(**fields: object) -> Transaction:
    return Transaction(amount=1, occurred_on=date(2026, 10, 1), patient_id=1, **fields)


def test_charge_drops_every_payment_field() -> None:
    tx = _tx(
        type=TxType.CHARGE,
        payer_name="x",
        account_id=3,
        method=PaymentMethod.CHEQUE,
        reference="9",
        cheque_due_on=date(2026, 11, 1),
        cheque_status=ChequeStatus.PENDING,
    )
    normalize(tx)
    assert (tx.payer_name, tx.account_id, tx.method, tx.reference) == (None, None, None, None)
    assert (tx.cheque_due_on, tx.cheque_status) == (None, None)


def test_payment_defaults_to_card_and_cheque_starts_pending() -> None:
    card = _tx(type=TxType.PAYMENT)
    normalize(card)
    assert card.method == PaymentMethod.CARD

    cheque = _tx(type=TxType.PAYMENT, method=PaymentMethod.CHEQUE)
    normalize(cheque)
    assert cheque.cheque_status == ChequeStatus.PENDING
    assert not counts(cheque)


def test_refund_has_no_payer_and_no_cheque() -> None:
    tx = _tx(
        type=TxType.REFUND,
        payer_name="x",
        method=PaymentMethod.CASH,
        cheque_status=ChequeStatus.CLEARED,
    )
    normalize(tx)
    assert tx.payer_name is None and tx.cheque_status is None and counts(tx)


def test_apply_patch_never_clears_required_fields() -> None:
    target = SimpleNamespace(title="a", note="b")
    apply_patch(target, {"title": None, "note": None}, required=("title",))
    assert (target.title, target.note) == ("a", None)


def test_filter_builds_only_the_conditions_given() -> None:
    assert TransactionFilter().conditions() == []
    flt = TransactionFilter(patient_id=1, date_from=date(2026, 1, 1), by_effective_date=True)
    assert len(flt.conditions()) == 2
