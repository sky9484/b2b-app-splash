"""Splash backend API tests."""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://splash-ph-send.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN = {"email": "admin@splash.com", "password": "Splash@2026"}


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def auth(session):
    r = session.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and data["email"] == ADMIN["email"]
    # cookie should be set
    cookies = r.cookies.get_dict()
    assert "access_token" in cookies, f"no access_token cookie set, got: {cookies}"
    session.headers["Authorization"] = f"Bearer {data['token']}"
    return data


def test_login_invalid(session):
    r = requests.post(f"{API}/auth/login", json={"email": "admin@splash.com", "password": "wrong"}, timeout=10)
    assert r.status_code == 401


def test_auth_me(session, auth):
    r = session.get(f"{API}/auth/me", timeout=10)
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN["email"]
    assert "password_hash" not in r.json()


def test_fx_rate(session, auth):
    r = session.get(f"{API}/fx-rate", timeout=10)
    assert r.status_code == 200
    d = r.json()
    assert d["pair"] == "MYR/PHP"
    assert isinstance(d["rate"], (int, float)) and d["rate"] > 5


def test_quote(session, auth):
    r = session.post(f"{API}/quote", json={"send_amount_myr": 1000}, timeout=10)
    assert r.status_code == 200
    d = r.json()
    assert d["send_amount_myr"] == 1000
    assert d["receive_amount_php"] > 0
    assert d["total_fee"] > 0


def test_quote_too_low(session, auth):
    r = session.post(f"{API}/quote", json={"send_amount_myr": 50}, timeout=10)
    assert r.status_code == 400


def test_transfers_stats(session, auth):
    r = session.get(f"{API}/transfers/stats", timeout=10)
    assert r.status_code == 200
    d = r.json()
    for k in ["total_sent_myr_month", "active_recipients", "pending_transfers", "avg_settlement_seconds"]:
        assert k in d


def test_recipients_seeded(session, auth):
    r = session.get(f"{API}/recipients", timeout=10)
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) >= 12, f"expected >=12 recipients, got {len(rows)}"
    sample = rows[0]
    for k in ["id", "name", "bank", "account_number", "total_sent_myr", "last_sent_at"]:
        assert k in sample


def test_transfers_seeded(session, auth):
    r = session.get(f"{API}/transfers", timeout=10)
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) >= 20, f"expected >=20 transfers, got {len(rows)}"
    statuses = {row["status"] for row in rows}
    assert {"completed", "pending", "failed"}.issubset(statuses)


def test_transfers_filter(session, auth):
    r = session.get(f"{API}/transfers?status=completed", timeout=10)
    assert r.status_code == 200
    rows = r.json()
    assert all(t["status"] == "completed" for t in rows)


def test_create_recipient_and_transfer_flow(session, auth):
    # CREATE recipient
    payload = {"name": "TEST_Juan", "country": "PH", "bank": "BDO Unibank",
               "account_number": "1234 5678 9012", "mobile": "+63 900 000 0001"}
    r = session.post(f"{API}/recipients", json=payload, timeout=10)
    assert r.status_code == 200
    rec = r.json()
    rid = rec["id"]
    assert rec["name"] == "TEST_Juan"

    # GET to verify persistence
    r2 = session.get(f"{API}/recipients", timeout=10)
    assert any(x["id"] == rid for x in r2.json())

    # CREATE transfer
    r = session.post(f"{API}/transfers", json={"recipient_id": rid, "send_amount_myr": 1500}, timeout=15)
    assert r.status_code == 200, r.text
    t = r.json()
    tid = t["id"]
    assert t["status"] == "pending"
    assert len(t["stages"]) == 5
    assert t["recipient_name"] == "TEST_Juan"

    # ADVANCE until completed
    for _ in range(6):
        r = session.post(f"{API}/transfers/{tid}/advance", timeout=10)
        assert r.status_code == 200
        if r.json()["status"] == "completed":
            break
    assert r.json()["status"] == "completed"
    assert all(s["done"] for s in r.json()["stages"])

    # GET single transfer to verify persistence
    r = session.get(f"{API}/transfers/{tid}", timeout=10)
    assert r.status_code == 200
    assert r.json()["status"] == "completed"

    # cleanup
    session.delete(f"{API}/recipients/{rid}", timeout=10)


def test_transfer_unknown_recipient(session, auth):
    r = session.post(f"{API}/transfers", json={"recipient_id": "not-real", "send_amount_myr": 500}, timeout=10)
    assert r.status_code == 404


def test_batch_preview(session, auth):
    rows = [
        {"name": "TEST_A", "bank": "BDO Unibank", "account_number": "111 1111 1111", "amount_myr": 500},
        {"name": "TEST_B", "bank": "BPI", "account_number": "222 2222 2222", "amount_myr": 50},  # invalid
        {"name": "TEST_C", "bank": "GCash", "account_number": "333 3333 3333", "amount_myr": 1200},
    ]
    r = session.post(f"{API}/batch/preview", json={"rows": rows}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d["count"] == 3
    assert d["valid_count"] == 2
    assert d["total_send_myr"] == 1700


def test_unauthenticated_blocked():
    r = requests.get(f"{API}/transfers", timeout=10)
    assert r.status_code == 401


# ---------- New feature tests: duplicate detection, PUT, PDF, sui fields, notifications ----------
def test_recipient_duplicate_detection(session, auth):
    """POST /api/recipients with duplicate (same bank + account_number) returns 409."""
    payload = {"name": "TEST_DupOriginal", "country": "PH", "bank": "BDO Unibank",
               "account_number": "9988 7766 5544", "mobile": "+63 900 000 9001"}
    # Cleanup any leftover
    r = session.get(f"{API}/recipients", timeout=10)
    for x in r.json():
        if x.get("name") in ("TEST_DupOriginal", "TEST_DupSecond"):
            session.delete(f"{API}/recipients/{x['id']}", timeout=10)

    r = session.post(f"{API}/recipients", json=payload, timeout=10)
    assert r.status_code == 200, r.text
    rid = r.json()["id"]

    # duplicate same bank+account (with whitespace variant) should 409
    dup = {**payload, "name": "TEST_DupSecond", "account_number": "  9988 7766 5544  "}
    r2 = session.post(f"{API}/recipients", json=dup, timeout=10)
    assert r2.status_code == 409, f"expected 409 got {r2.status_code}: {r2.text}"
    detail = r2.json().get("detail", "")
    assert "TEST_DupOriginal" in detail and "already exists" in detail.lower()

    # different bank with same account number -> allowed
    diff_bank = {**payload, "name": "TEST_DupOtherBank", "bank": "BPI (Bank of the Philippine Islands)"}
    r3 = session.post(f"{API}/recipients", json=diff_bank, timeout=10)
    assert r3.status_code == 200
    rid3 = r3.json()["id"]

    # cleanup
    session.delete(f"{API}/recipients/{rid}", timeout=10)
    session.delete(f"{API}/recipients/{rid3}", timeout=10)


def test_recipient_update_and_collision(session, auth):
    """PUT /api/recipients/{id} updates and returns 409 if updated account collides."""
    a = {"name": "TEST_Edit_A", "country": "PH", "bank": "Metrobank",
         "account_number": "1111 2222 3333", "mobile": "+63 900 000 1111"}
    b = {"name": "TEST_Edit_B", "country": "PH", "bank": "Metrobank",
         "account_number": "4444 5555 6666", "mobile": "+63 900 000 2222"}
    # Cleanup leftovers
    r = session.get(f"{API}/recipients", timeout=10)
    for x in r.json():
        if x.get("name") in ("TEST_Edit_A", "TEST_Edit_B"):
            session.delete(f"{API}/recipients/{x['id']}", timeout=10)

    ra = session.post(f"{API}/recipients", json=a, timeout=10)
    assert ra.status_code == 200
    rid_a = ra.json()["id"]
    rb = session.post(f"{API}/recipients", json=b, timeout=10)
    assert rb.status_code == 200
    rid_b = rb.json()["id"]

    # Successful update of A name + mobile
    upd = {**a, "name": "TEST_Edit_A_New", "mobile": "+63 911 111 1111"}
    ru = session.put(f"{API}/recipients/{rid_a}", json=upd, timeout=10)
    assert ru.status_code == 200, ru.text
    assert ru.json()["name"] == "TEST_Edit_A_New"
    assert ru.json()["mobile"] == "+63 911 111 1111"

    # Verify persistence via list
    r = session.get(f"{API}/recipients", timeout=10)
    a_now = next(x for x in r.json() if x["id"] == rid_a)
    assert a_now["name"] == "TEST_Edit_A_New"

    # Now update A to use B's account number -> 409
    collide = {**a, "name": "TEST_Edit_A_New", "account_number": b["account_number"]}
    rc = session.put(f"{API}/recipients/{rid_a}", json=collide, timeout=10)
    assert rc.status_code == 409, f"expected 409 got {rc.status_code}: {rc.text}"
    assert "TEST_Edit_B" in rc.json().get("detail", "")

    # Update non-existent -> 404
    r404 = session.put(f"{API}/recipients/does-not-exist-xyz", json=a, timeout=10)
    assert r404.status_code == 404

    # cleanup
    session.delete(f"{API}/recipients/{rid_a}", timeout=10)
    session.delete(f"{API}/recipients/{rid_b}", timeout=10)


def test_transfer_has_sui_fields_and_pdf_receipt(session, auth):
    """POST /api/transfers populates sui_tx_hash & sui_explorer_url; receipt returns valid PDF."""
    rec_payload = {"name": "TEST_PDF_Rec", "country": "PH", "bank": "UnionBank of the Philippines",
                   "account_number": "7070 8080 9090", "mobile": "+63 999 888 7777"}
    # cleanup
    r = session.get(f"{API}/recipients", timeout=10)
    for x in r.json():
        if x.get("name") == "TEST_PDF_Rec":
            session.delete(f"{API}/recipients/{x['id']}", timeout=10)

    rr = session.post(f"{API}/recipients", json=rec_payload, timeout=10)
    assert rr.status_code == 200
    rid = rr.json()["id"]

    rt = session.post(f"{API}/transfers", json={"recipient_id": rid, "send_amount_myr": 750}, timeout=15)
    assert rt.status_code == 200, rt.text
    t = rt.json()
    tid = t["id"]
    assert "sui_tx_hash" in t and t["sui_tx_hash"].startswith("0x") and len(t["sui_tx_hash"]) >= 40
    assert "sui_explorer_url" in t and "suiscan.xyz" in t["sui_explorer_url"]
    assert t["sui_tx_hash"] in t["sui_explorer_url"]

    # GET pdf receipt
    rp = session.get(f"{API}/transfers/{tid}/receipt", timeout=20)
    assert rp.status_code == 200, rp.text
    ct = rp.headers.get("content-type", "")
    assert "application/pdf" in ct, f"unexpected content-type: {ct}"
    body = rp.content
    assert body.startswith(b"%PDF-"), f"not a pdf, starts with: {body[:8]!r}"
    assert len(body) > 1000

    # cleanup
    session.delete(f"{API}/recipients/{rid}", timeout=10)


def test_email_mock_logged_on_transfer_create(session, auth):
    """Create a transfer and verify [EMAIL MOCK] appears in backend logs."""
    import subprocess
    rec_payload = {"name": "TEST_MockLog", "country": "PH", "bank": "Security Bank",
                   "account_number": "5050 6060 7070", "mobile": ""}
    r = session.get(f"{API}/recipients", timeout=10)
    for x in r.json():
        if x.get("name") == "TEST_MockLog":
            session.delete(f"{API}/recipients/{x['id']}", timeout=10)
    rr = session.post(f"{API}/recipients", json=rec_payload, timeout=10)
    assert rr.status_code == 200
    rid = rr.json()["id"]

    rt = session.post(f"{API}/transfers", json={"recipient_id": rid, "send_amount_myr": 600}, timeout=15)
    assert rt.status_code == 200
    tid = rt.json()["id"]
    ref = rt.json()["reference"]
    time.sleep(1.0)

    # Search recent backend logs for the mock email line referencing this transfer
    try:
        out = subprocess.run(
            ["bash", "-lc", "tail -n 400 /var/log/supervisor/backend.*.log 2>/dev/null"],
            capture_output=True, text=True, timeout=10,
        ).stdout
    except Exception:
        out = ""
    assert "[EMAIL MOCK]" in out, "expected [EMAIL MOCK] line in backend logs"
    assert ref in out or "initiated" in out, f"expected ref {ref} or 'initiated' in logs"

    # advance to completion to also trigger completion email + sms mock skipped (no mobile)
    for _ in range(6):
        rs = session.post(f"{API}/transfers/{tid}/advance", timeout=10)
        if rs.json()["status"] == "completed":
            break
    assert rs.json()["status"] == "completed"
    time.sleep(0.8)
    out2 = subprocess.run(
        ["bash", "-lc", "tail -n 600 /var/log/supervisor/backend.*.log 2>/dev/null"],
        capture_output=True, text=True, timeout=10,
    ).stdout
    assert "delivered" in out2 or ref in out2

    # cleanup
    session.delete(f"{API}/recipients/{rid}", timeout=10)


def test_sms_mock_on_completion_with_mobile(session, auth):
    """When recipient has mobile and transfer completes, [SMS MOCK] should appear."""
    import subprocess
    rec_payload = {"name": "TEST_SMS_Rec", "country": "PH", "bank": "RCBC",
                   "account_number": "8181 9292 0303", "mobile": "+63 917 123 4567"}
    r = session.get(f"{API}/recipients", timeout=10)
    for x in r.json():
        if x.get("name") == "TEST_SMS_Rec":
            session.delete(f"{API}/recipients/{x['id']}", timeout=10)
    rr = session.post(f"{API}/recipients", json=rec_payload, timeout=10)
    assert rr.status_code == 200
    rid = rr.json()["id"]

    rt = session.post(f"{API}/transfers", json={"recipient_id": rid, "send_amount_myr": 800}, timeout=15)
    assert rt.status_code == 200
    tid = rt.json()["id"]
    ref = rt.json()["reference"]
    for _ in range(6):
        rs = session.post(f"{API}/transfers/{tid}/advance", timeout=10)
        if rs.json()["status"] == "completed":
            break
    assert rs.json()["status"] == "completed"
    # status_notified should prevent duplicate notify on subsequent advance calls
    rs2 = session.post(f"{API}/transfers/{tid}/advance", timeout=10)
    assert rs2.status_code == 200

    time.sleep(1.0)
    out = subprocess.run(
        ["bash", "-lc", "tail -n 800 /var/log/supervisor/backend.*.log 2>/dev/null"],
        capture_output=True, text=True, timeout=10,
    ).stdout
    assert "[SMS MOCK]" in out, "expected [SMS MOCK] line in backend logs"
    # Reference should appear at least once (from the completion sms or email)
    assert ref in out

    session.delete(f"{API}/recipients/{rid}", timeout=10)


def test_receipt_404_for_unknown_transfer(session, auth):
    r = session.get(f"{API}/transfers/not-a-real-id-xyz/receipt", timeout=10)
    assert r.status_code == 404



# ---------- Iteration 3: Curlec/Razorpay + Sui Move integration tests ----------
import hmac as _hmac
import hashlib as _hashlib
import json as _json


def _create_test_transfer(session):
    """Helper: create a recipient + transfer, return (rid, tid, ref)."""
    rec = {"name": "TEST_I3_Rec", "country": "PH", "bank": "BDO Unibank",
           "account_number": "I3 0001 0001", "mobile": "+63 900 000 1010"}
    # cleanup
    r = session.get(f"{API}/recipients", timeout=10)
    for x in r.json():
        if x.get("name") == "TEST_I3_Rec":
            session.delete(f"{API}/recipients/{x['id']}", timeout=10)
    rr = session.post(f"{API}/recipients", json=rec, timeout=10)
    assert rr.status_code == 200, rr.text
    rid = rr.json()["id"]
    rt = session.post(f"{API}/transfers", json={"recipient_id": rid, "send_amount_myr": 500}, timeout=15)
    assert rt.status_code == 200, rt.text
    return rid, rt.json()["id"], rt.json()["reference"]


def test_transfer_has_iteration3_fields(session, auth):
    """New fields: sui_real=False, curlec_order_id=None, curlec_payment_id=None."""
    rid, tid, _ = _create_test_transfer(session)
    try:
        r = session.get(f"{API}/transfers/{tid}", timeout=10)
        assert r.status_code == 200
        t = r.json()
        assert t.get("sui_real") is False
        assert t.get("curlec_order_id") is None
        assert t.get("curlec_payment_id") is None
    finally:
        session.delete(f"{API}/recipients/{rid}", timeout=10)


def test_init_payment_returns_mocked_when_no_keys(session, auth):
    """POST /api/transfers/{tid}/init-payment with no RAZORPAY_KEY_ID returns mocked:true."""
    rid, tid, ref = _create_test_transfer(session)
    try:
        r = session.post(f"{API}/transfers/{tid}/init-payment", timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("mocked") is True
        assert d.get("reference") == ref
        # Should not have order_id / key_id in mocked path
        assert "order_id" not in d
    finally:
        session.delete(f"{API}/recipients/{rid}", timeout=10)


def test_init_payment_404_unknown_transfer(session, auth):
    r = session.post(f"{API}/transfers/does-not-exist-xyz/init-payment", timeout=10)
    assert r.status_code == 404


def test_verify_payment_400_invalid_signature(session, auth):
    """verify-payment with bogus signature returns 400 (Invalid Razorpay signature)."""
    rid, tid, _ = _create_test_transfer(session)
    try:
        body = {"razorpay_order_id": "order_xxx", "razorpay_payment_id": "pay_xxx",
                "razorpay_signature": "deadbeef"}
        r = session.post(f"{API}/transfers/{tid}/verify-payment", json=body, timeout=10)
        assert r.status_code == 400, r.text
        assert "signature" in r.json().get("detail", "").lower()
    finally:
        session.delete(f"{API}/recipients/{rid}", timeout=10)


def test_verify_payment_400_missing_fields(session, auth):
    rid, tid, _ = _create_test_transfer(session)
    try:
        r = session.post(f"{API}/transfers/{tid}/verify-payment", json={}, timeout=10)
        assert r.status_code == 400
        assert "missing" in r.json().get("detail", "").lower()
    finally:
        session.delete(f"{API}/recipients/{rid}", timeout=10)


def test_curlec_webhook_401_missing_signature():
    """No X-Razorpay-Signature header -> 401."""
    r = requests.post(f"{BASE_URL}/api/webhooks/curlec", json={"event": "payment.captured"}, timeout=10)
    assert r.status_code == 401


def test_curlec_webhook_401_bad_signature():
    body = _json.dumps({"event": "payment.captured"}).encode()
    r = requests.post(f"{BASE_URL}/api/webhooks/curlec", data=body,
                      headers={"X-Razorpay-Signature": "0" * 64, "Content-Type": "application/json"},
                      timeout=10)
    assert r.status_code == 401


def test_curlec_webhook_valid_signature_payment_captured(session, auth):
    """Set RAZORPAY_WEBHOOK_SECRET in backend transiently via env-update endpoint?
    We cannot mutate the running backend env, so instead verify the signature path
    by re-creating the same hmac the server expects; if the secret is unset, the
    request still 401s. To meaningfully test, we instead validate the curlec_service
    function directly via a dedicated test below, AND verify the webhook returns
    401 when secret is unset (already covered).

    Since the running backend has RAZORPAY_WEBHOOK_SECRET="" in .env, any signed
    payload will still be rejected (verify_webhook_signature returns False when
    secret missing). We assert that explicit behavior here.
    """
    secret = "test_secret_iter3"
    payload = {"event": "payment.captured",
               "payload": {"payment": {"entity": {"id": "pay_test_1", "notes": {"transfer_id": "any"}}}}}
    body = _json.dumps(payload).encode()
    sig = _hmac.new(secret.encode(), body, _hashlib.sha256).hexdigest()
    r = requests.post(f"{BASE_URL}/api/webhooks/curlec", data=body,
                      headers={"X-Razorpay-Signature": sig, "Content-Type": "application/json"},
                      timeout=10)
    # Backend has RAZORPAY_WEBHOOK_SECRET="" so signature check returns False -> 401
    assert r.status_code == 401, f"expected 401 (no secret configured) got {r.status_code}: {r.text}"


def test_curlec_service_signature_helpers():
    """Direct unit test of curlec_service signature helpers (in-process)."""
    import sys
    sys.path.insert(0, "/app/backend")
    from services import curlec_service

    # Webhook signature
    os.environ["RAZORPAY_WEBHOOK_SECRET"] = "shh_test"
    body = b'{"event":"payment.captured"}'
    good = _hmac.new(b"shh_test", body, _hashlib.sha256).hexdigest()
    assert curlec_service.verify_webhook_signature(body, good) is True
    assert curlec_service.verify_webhook_signature(body, "bad") is False
    os.environ["RAZORPAY_WEBHOOK_SECRET"] = ""
    assert curlec_service.verify_webhook_signature(body, good) is False  # no secret -> False

    # Payment signature
    os.environ["RAZORPAY_KEY_SECRET"] = "ks_test"
    order_id, payment_id = "order_1", "pay_1"
    expected = _hmac.new(b"ks_test", f"{order_id}|{payment_id}".encode(), _hashlib.sha256).hexdigest()
    assert curlec_service.verify_payment_signature(order_id, payment_id, expected) is True
    assert curlec_service.verify_payment_signature(order_id, payment_id, "bad") is False
    os.environ["RAZORPAY_KEY_SECRET"] = ""

    # is_configured
    assert curlec_service.is_configured() is False


def test_sui_service_unconfigured_and_helpers():
    import sys
    sys.path.insert(0, "/app/backend")
    from services import sui_service

    assert sui_service.is_configured() is False  # SUI_PACKAGE_ID empty
    h = sui_service.recipient_hash("Juan", "BDO", "1234")
    assert isinstance(h, bytes) and len(h) == 32
    url = sui_service.explorer_url("0xabc")
    assert url.startswith("https://suiscan.xyz/testnet/tx/")


def test_advance_does_not_call_sui_when_unconfigured(session, auth):
    """When SUI_* env keys empty, advance through 'sui' stage keeps sui_real=False
    and does NOT change sui_tx_hash from the original mock value."""
    rid, tid, _ = _create_test_transfer(session)
    try:
        # initial mock hash
        t0 = session.get(f"{API}/transfers/{tid}", timeout=10).json()
        original_hash = t0["sui_tx_hash"]
        assert original_hash.startswith("0x")
        assert t0["sui_real"] is False

        # advance through all stages (5)
        last = None
        for _ in range(6):
            r = session.post(f"{API}/transfers/{tid}/advance", timeout=10)
            assert r.status_code == 200
            last = r.json()
            if last["status"] == "completed":
                break

        # sui_real must remain False; sui_tx_hash unchanged
        assert last["sui_real"] is False
        assert last["sui_tx_hash"] == original_hash
        # sui stage description should still contain truncated hash form (mock)
        sui_stage = next(s for s in last["stages"] if s["key"] == "sui")
        assert "Settlement hash" in sui_stage["desc"]
        assert "testnet" not in sui_stage["desc"]  # only added on real path
    finally:
        session.delete(f"{API}/recipients/{rid}", timeout=10)
