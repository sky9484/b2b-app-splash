"""Splash backend integration for Curlec (Razorpay's Malaysia entity).

When ``RAZORPAY_KEY_ID`` + ``RAZORPAY_KEY_SECRET`` are present in env we
return real Razorpay/Curlec orders for the payout's MYR debit. The frontend
opens the official Razorpay checkout in a popup. Razorpay then sends a webhook
to ``/api/webhooks/curlec`` that advances the transfer's stages server-side.

If the keys are missing we fall back to the existing mocked FPX flow — the
frontend gets ``{"mocked": true}`` and shows the in-app bank picker.
"""
from __future__ import annotations

import hmac
import hashlib
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    return bool(os.environ.get("RAZORPAY_KEY_ID") and os.environ.get("RAZORPAY_KEY_SECRET"))


def public_key_id() -> str:
    return os.environ.get("RAZORPAY_KEY_ID", "")


def _client():
    import razorpay
    return razorpay.Client(auth=(
        os.environ["RAZORPAY_KEY_ID"], os.environ["RAZORPAY_KEY_SECRET"]
    ))


def create_order(amount_myr: float, receipt: str, notes: Optional[dict] = None) -> Optional[dict]:
    """Create a Curlec/Razorpay order. amount in MYR, converted to sen.
    Returns order dict (with ``id``) or None on failure / unconfigured."""
    if not is_configured():
        return None
    try:
        client = _client()
        return client.order.create({
            "amount": int(round(amount_myr * 100)),  # sen
            "currency": "MYR",
            "receipt": receipt[:40],
            "notes": notes or {},
            "payment_capture": 1,
        })
    except Exception as e:
        logger.warning(f"razorpay order failed: {e}")
        return None


def verify_webhook_signature(body_bytes: bytes, signature: str) -> bool:
    secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET")
    if not secret:
        return False
    expected = hmac.new(secret.encode(), body_bytes, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature or "")


def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    secret = os.environ.get("RAZORPAY_KEY_SECRET", "")
    payload = f"{order_id}|{payment_id}".encode()
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature or "")
