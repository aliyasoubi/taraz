from tests.conftest import Api


def test_balance_is_charges_minus_payments(api: Api) -> None:
    pid = api.patient()
    api.tx(pid, "charge", 1_000_000)
    api.tx(pid, "payment", 300_000, method="card")
    api.tx(pid, "discount", 100_000)
    b = api.balance(pid)
    assert b["balance"] == 600_000
    assert (b["charged"], b["paid"], b["discounted"]) == (1_000_000, 300_000, 100_000)


def test_deposit_before_treatment_is_credit(api: Api) -> None:
    pid = api.patient()
    api.tx(pid, "payment", 50_000_000, method="pos", description="بیعانه")
    assert api.balance(pid)["balance"] == -50_000_000


def test_refund_reopens_balance(api: Api) -> None:
    pid = api.patient()
    api.tx(pid, "payment", 500, method="cash")
    api.tx(pid, "refund", 200, method="cash")
    assert api.balance(pid)["balance"] == -300


def test_cheque_counts_only_once_cleared(api: Api) -> None:
    pid = api.patient()
    api.tx(pid, "charge", 1_000)
    cheque = api.tx(pid, "payment", 400, method="cheque", cheque_due_on="2026-11-20")
    assert cheque["cheque_status"] == "pending" and cheque["counts"] is False
    b = api.balance(pid)
    assert (b["balance"], b["pending_cheques"]) == (1_000, 400)

    r = api.c.patch(f"/api/transactions/{cheque['id']}", json={"cheque_status": "cleared"})
    assert r.json()["counts"] is True
    b = api.balance(pid)
    assert (b["balance"], b["pending_cheques"]) == (600, 0)

    api.c.patch(f"/api/transactions/{cheque['id']}", json={"cheque_status": "bounced"})
    assert api.balance(pid)["balance"] == 1_000


def test_payment_records_source_and_destination(api: Api) -> None:
    """Mohammad pays for Ali's treatment straight into Mr. Ghomi's account."""
    ali = api.patient("علی")
    ghomi = api.account("آقای قمی", kind="third_party", bank="سامان")
    api.tx(ali, "charge", 2_000)
    tx = api.tx(ali, "payment", 1_500, payer_name="محمد", account_id=ghomi, method="card")
    assert tx["payer_name"] == "محمد"
    assert (tx["account_title"], tx["account_bank"]) == ("آقای قمی", "سامان")
    assert tx["patient_name"] == "علی"
    assert api.balance(ali)["balance"] == 500

    acc = api.c.get(f"/api/accounts/{ghomi}").json()
    assert acc["received_total"] == 1_500 and acc["tx_count"] == 1
    by_account = api.c.get(f"/api/transactions?account_id={ghomi}").json()
    assert by_account["total"] == 1 and by_account["sum_amount"] == 1_500


def test_switching_a_payment_to_a_charge_drops_payment_fields(api: Api) -> None:
    pid = api.patient()
    acc = api.account()
    tx = api.tx(pid, "payment", 100, payer_name="x", account_id=acc, method="cheque")
    r = api.c.patch(f"/api/transactions/{tx['id']}", json={"type": "charge"})
    out = r.json()
    assert out["type"] == "charge"
    assert out["payer_name"] is None and out["account_id"] is None and out["cheque_status"] is None


def test_treatment_balances_are_separate(api: Api) -> None:
    pid = api.patient()
    implant = api.c.post(
        f"/api/patients/{pid}/treatments", json={"title": "ایمپلنت", "kind": "implant"}
    ).json()
    api.tx(pid, "charge", 900, treatment_id=implant["id"])
    api.tx(pid, "charge", 100)
    api.tx(pid, "payment", 400, treatment_id=implant["id"], method="card")
    detail = api.balance(pid)
    assert detail["balance"] == 600
    (case,) = detail["treatments"]
    assert case["balance"] == 500


def test_treatment_must_belong_to_patient(api: Api) -> None:
    a, b = api.patient("الف"), api.patient("ب")
    t = api.c.post(f"/api/patients/{a}/treatments", json={"title": "x"}).json()
    r = api.c.post(
        "/api/transactions",
        json={
            "patient_id": b,
            "type": "charge",
            "amount": 1,
            "occurred_on": "2026-10-01",
            "treatment_id": t["id"],
        },
    )
    assert r.status_code == 422


def test_amount_must_be_positive(api: Api) -> None:
    pid = api.patient()
    for bad in (0, -5, 10**15):
        r = api.c.post(
            "/api/transactions",
            json={"patient_id": pid, "type": "charge", "amount": bad, "occurred_on": "2026-10-01"},
        )
        assert r.status_code == 422


def test_list_filters_and_persian_search(api: Api) -> None:
    debtor = api.patient("ستاره آسمانی‌نژاد")
    creditor = api.patient("آرين كوهستاني")  # Arabic ي and ك, as pasted from elsewhere
    settled = api.patient("سارا")
    api.tx(debtor, "charge", 10)
    api.tx(creditor, "payment", 10, method="cash")
    api.tx(settled, "charge", 10)
    api.tx(settled, "payment", 10, method="cash")

    def names(**params: str) -> list[str]:
        return [p["name"] for p in api.c.get("/api/patients", params=params).json()]

    assert names(status="debtor") == ["ستاره آسمانی‌نژاد"]
    assert names(status="creditor") == ["آرین کوهستانی"]
    assert names(status="settled") == ["سارا"]
    assert names(q="آسمانی نژاد") == ["ستاره آسمانی‌نژاد"]
    assert names(q="کوهستانی") == ["آرین کوهستانی"]


def test_account_in_use_cannot_be_deleted(api: Api) -> None:
    pid = api.patient()
    acc = api.account()
    api.tx(pid, "payment", 1, account_id=acc, method="card")
    assert api.c.delete(f"/api/accounts/{acc}").status_code == 409
    assert api.c.patch(f"/api/accounts/{acc}", json={"is_archived": True}).json()["is_archived"]


def test_deleting_a_patient_removes_their_ledger(api: Api) -> None:
    pid = api.patient()
    api.tx(pid, "charge", 1)
    assert api.c.delete(f"/api/patients/{pid}").status_code == 204
    assert api.c.get("/api/transactions").json()["total"] == 0


def test_suggestions_offer_previous_payers(api: Api) -> None:
    pid = api.patient()
    api.tx(pid, "payment", 1, payer_name="محمد", method="card")
    api.tx(pid, "payment", 1, payer_name="محمد", method="card")
    api.tx(pid, "payment", 1, payer_name="زهرا", method="card")
    assert api.c.get("/api/suggestions").json()["payers"] == ["محمد", "زهرا"]
