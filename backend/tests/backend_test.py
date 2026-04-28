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
