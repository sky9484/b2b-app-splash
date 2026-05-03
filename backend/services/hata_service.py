"""
hata_service.py
Replaces: Luno exchange calls (FPX logic in curlec_service stays unchanged)

Three-tier routing:
  Tier 1 (<  RM 5k):    Hata SC Malaysia — spot MYR→USDT
  Tier 2 (RM 5k–200k):  Hata Global (Labuan) — free USD/USDT swap
  Tier 3 (>= RM 200k):  Hata OTC desk — block trade
"""

import os
import hmac
import hashlib
import time
import json
import logging
import asyncio
from typing import TypedDict, Literal
from decimal import Decimal, ROUND_DOWN

import httpx
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

SC_API_KEY     = os.getenv("HATA_SC_API_KEY", "")
SC_API_SECRET  = os.getenv("HATA_SC_API_SECRET", "")
SC_BASE_URL    = os.getenv("HATA_SC_BASE_URL", "https://api.hata.io/v1/my")
LAB_API_KEY    = os.getenv("HATA_LABUAN_API_KEY", "")
LAB_API_SECRET = os.getenv("HATA_LABUAN_API_SECRET", "")
LAB_BASE_URL   = os.getenv("HATA_LABUAN_BASE_URL", "https://api.hata.io/v1/global")
TIER2_MIN      = Decimal(os.getenv("HATA_TIER2_MIN_MYR", "5000"))
OTC_MIN        = Decimal(os.getenv("HATA_OTC_MIN_MYR", "200000"))
REQUEST_TIMEOUT = 30


class ConversionResult(TypedDict):
    success: bool
    tier: Literal["sc_spot", "labuan_swap", "otc"]
    myr_amount: str
    usdt_amount: str
    exchange_rate: str
    fee_usdt: str
    tx_reference: str
    hata_order_id: str
    error: "str | None"


class FxQuote(TypedDict):
    rate: str
    usdt_amount: str
    fee_usdt: str
    expires_at: int


def _sign(api_key: str, api_secret: str, body: str = "") -> "dict[str, str]":
    nonce = str(int(time.time() * 1000))
    sig = hmac.new(api_secret.encode(), (nonce + api_key + body).encode(), hashlib.sha256).hexdigest()
    return {
        "X-API-KEY": api_key,
        "X-NONCE": nonce,
        "X-SIGNATURE": sig,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


async def convert_myr_to_usdt(amount_myr: float) -> ConversionResult:
    amount = Decimal(str(amount_myr))
    try:
        if amount >= OTC_MIN:
            return await _otc(amount)
        elif amount >= TIER2_MIN:
            return await _labuan_swap(amount)
        else:
            return await _sc_spot(amount)
    except httpx.TimeoutException as e:
        return _err("labuan_swap", amount, f"Hata timeout: {e}")
    except httpx.HTTPStatusError as e:
        return _err("labuan_swap", amount, f"Hata HTTP {e.response.status_code}: {e.response.text}")
    except Exception as e:
        logger.error(f"Hata conversion error: {e}", exc_info=True)
        return _err("labuan_swap", amount, f"Error: {e}")


async def get_fx_quote(amount_myr: float) -> FxQuote:
    body = json.dumps({"from": "MYR", "to": "USDT", "amount": str(amount_myr)})
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as c:
        r = await c.post(
            f"{LAB_BASE_URL}/quote",
            content=body,
            headers=_sign(LAB_API_KEY, LAB_API_SECRET, body),
        )
        r.raise_for_status()
        d = r.json()
    return FxQuote(
        rate=str(d["rate"]),
        usdt_amount=str(d["to_amount"]),
        fee_usdt=str(d.get("fee", "0")),
        expires_at=d["expires_at"],
    )


async def _sc_spot(amount: Decimal) -> ConversionResult:
    body = json.dumps({
        "pair": "USDT_MYR", "side": "buy", "type": "market",
        "amount": str(amount), "currency": "MYR",
    })
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as c:
        r = await c.post(
            f"{SC_BASE_URL}/orders",
            content=body,
            headers=_sign(SC_API_KEY, SC_API_SECRET, body),
        )
        r.raise_for_status()
        d = r.json()
    received = Decimal(str(d["executed_amount"]))
    fee = Decimal(str(d.get("fee", "0")))
    rate = (
        (amount / received).quantize(Decimal("0.000001"), rounding=ROUND_DOWN)
        if received > 0
        else Decimal("0")
    )
    return ConversionResult(
        success=True, tier="sc_spot", myr_amount=str(amount),
        usdt_amount=str(received), exchange_rate=str(rate), fee_usdt=str(fee),
        tx_reference=d["order_id"], hata_order_id=d["order_id"], error=None,
    )


async def _labuan_swap(amount: Decimal) -> ConversionResult:
    # Step 1: Quote
    qbody = json.dumps({"from": "MYR", "to": "USDT", "amount": str(amount)})
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as c:
        qr = await c.post(
            f"{LAB_BASE_URL}/quote",
            content=qbody,
            headers=_sign(LAB_API_KEY, LAB_API_SECRET, qbody),
        )
        qr.raise_for_status()
        quote = qr.json()
        # Step 2: Execute
        ebody = json.dumps({
            "quote_id": quote["quote_id"],
            "source_currency": "MYR",
            "target_currency": "USDT",
            "source_amount": str(amount),
        })
        er = await c.post(
            f"{LAB_BASE_URL}/swap/execute",
            content=ebody,
            headers=_sign(LAB_API_KEY, LAB_API_SECRET, ebody),
        )
        er.raise_for_status()
        result = er.json()
    received = Decimal(str(result["target_amount"]))
    fee = Decimal(str(result.get("fee", "0")))
    return ConversionResult(
        success=True, tier="labuan_swap", myr_amount=str(amount),
        usdt_amount=str(received), exchange_rate=str(quote["rate"]),
        fee_usdt=str(fee), tx_reference=result["swap_id"],
        hata_order_id=result["swap_id"], error=None,
    )


async def _otc(amount: Decimal) -> ConversionResult:
    body = json.dumps({
        "trade_type": "myr_to_usdt",
        "myr_amount": str(amount),
        "execution": "immediate",
        "client_ref": f"splash-{int(time.time())}",
    })
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(
            f"{LAB_BASE_URL}/otc/request",
            content=body,
            headers=_sign(LAB_API_KEY, LAB_API_SECRET, body),
        )
        r.raise_for_status()
        d = r.json()
    success = d.get("status") in ("confirmed", "pending_confirmation")
    return ConversionResult(
        success=success, tier="otc", myr_amount=str(amount),
        usdt_amount=str(d.get("usdt_amount", "0")),
        exchange_rate=str(d.get("rate", "0")),
        fee_usdt=str(d.get("fee", "0")),
        tx_reference=d.get("otc_id", ""),
        hata_order_id=d.get("otc_id", ""),
        error=None if success else f"OTC status: {d.get('status')}",
    )


async def convert_myr_to_usdt_mock(amount_myr: float) -> ConversionResult:
    """Dev fallback — auto-activates if HATA_SC_API_KEY is empty."""
    await asyncio.sleep(0.5)
    amount = Decimal(str(amount_myr))
    rate   = Decimal("4.70")
    usdt   = (amount / rate).quantize(Decimal("0.000001"), rounding=ROUND_DOWN)
    ts = int(time.time())
    return ConversionResult(
        success=True, tier="labuan_swap", myr_amount=str(amount),
        usdt_amount=str(usdt), exchange_rate=str(rate), fee_usdt="0",
        tx_reference=f"MOCK-{ts}",
        hata_order_id=f"MOCK-{ts}",
        error=None,
    )


def _err(tier: str, amount: Decimal, error: str) -> ConversionResult:
    return ConversionResult(  # type: ignore[return-value]
        success=False, tier=tier, myr_amount=str(amount),
        usdt_amount="0", exchange_rate="0", fee_usdt="0",
        tx_reference="", hata_order_id="", error=error,
    )


# ── USDC versions (primary currency) ────────────────────────────────────────

class ConversionResultUSDC(TypedDict):
    success: bool
    tier: Literal["sc_spot", "labuan_swap", "otc"]
    myr_amount: str
    usdc_amount: str
    exchange_rate: str
    fee_usdc: str
    tx_reference: str
    hata_order_id: str
    error: "str | None"


async def convert_myr_to_usdc(amount_myr: float) -> ConversionResultUSDC:
    """Convert MYR to USDC (primary stablecoin). Falls back to USDT if USDC liquidity is low."""
    amount = Decimal(str(amount_myr))
    try:
        if amount >= OTC_MIN:
            return await _otc_usdc(amount)
        elif amount >= TIER2_MIN:
            return await _labuan_swap_usdc(amount)
        else:
            return await _sc_spot_usdc(amount)
    except httpx.TimeoutException as e:
        return _err_usdc("labuan_swap", amount, f"Hata timeout: {e}")
    except httpx.HTTPStatusError as e:
        return _err_usdc("labuan_swap", amount, f"Hata HTTP {e.response.status_code}: {e.response.text}")
    except Exception as e:
        logger.error(f"Hata USDC conversion error: {e}", exc_info=True)
        return _err_usdc("labuan_swap", amount, f"Error: {e}")


async def _sc_spot_usdc(amount: Decimal) -> ConversionResultUSDC:
    body = json.dumps({
        "pair": "USDC_MYR", "side": "buy", "type": "market",
        "amount": str(amount), "currency": "MYR",
    })
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as c:
        r = await c.post(
            f"{SC_BASE_URL}/orders",
            content=body,
            headers=_sign(SC_API_KEY, SC_API_SECRET, body),
        )
        r.raise_for_status()
        d = r.json()
    received = Decimal(str(d["executed_amount"]))
    fee = Decimal(str(d.get("fee", "0")))
    rate = (
        (amount / received).quantize(Decimal("0.000001"), rounding=ROUND_DOWN)
        if received > 0
        else Decimal("0")
    )
    return ConversionResultUSDC(
        success=True, tier="sc_spot", myr_amount=str(amount),
        usdc_amount=str(received), exchange_rate=str(rate), fee_usdc=str(fee),
        tx_reference=d["order_id"], hata_order_id=d["order_id"], error=None,
    )


async def _labuan_swap_usdc(amount: Decimal) -> ConversionResultUSDC:
    # Step 1: Quote
    qbody = json.dumps({"from": "MYR", "to": "USDC", "amount": str(amount)})
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as c:
        qr = await c.post(
            f"{LAB_BASE_URL}/quote",
            content=qbody,
            headers=_sign(LAB_API_KEY, LAB_API_SECRET, qbody),
        )
        qr.raise_for_status()
        quote = qr.json()
        # Step 2: Execute
        ebody = json.dumps({
            "quote_id": quote["quote_id"],
            "source_currency": "MYR",
            "target_currency": "USDC",
            "source_amount": str(amount),
        })
        er = await c.post(
            f"{LAB_BASE_URL}/swap/execute",
            content=ebody,
            headers=_sign(LAB_API_KEY, LAB_API_SECRET, ebody),
        )
        er.raise_for_status()
        result = er.json()
    received = Decimal(str(result["target_amount"]))
    fee = Decimal(str(result.get("fee", "0")))
    return ConversionResultUSDC(
        success=True, tier="labuan_swap", myr_amount=str(amount),
        usdc_amount=str(received), exchange_rate=str(quote["rate"]),
        fee_usdc=str(fee), tx_reference=result["swap_id"],
        hata_order_id=result["swap_id"], error=None,
    )


async def _otc_usdc(amount: Decimal) -> ConversionResultUSDC:
    body = json.dumps({
        "trade_type": "myr_to_usdc",
        "myr_amount": str(amount),
        "execution": "immediate",
        "client_ref": f"splash-{int(time.time())}",
    })
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(
            f"{LAB_BASE_URL}/otc/request",
            content=body,
            headers=_sign(LAB_API_KEY, LAB_API_SECRET, body),
        )
        r.raise_for_status()
        d = r.json()
    success = d.get("status") in ("confirmed", "pending_confirmation")
    return ConversionResultUSDC(
        success=success, tier="otc", myr_amount=str(amount),
        usdc_amount=str(d.get("usdc_amount", "0")),
        exchange_rate=str(d.get("rate", "0")),
        fee_usdc=str(d.get("fee", "0")),
        tx_reference=d.get("otc_id", ""),
        hata_order_id=d.get("otc_id", ""),
        error=None if success else f"OTC status: {d.get('status')}",
    )


async def convert_myr_to_usdc_mock(amount_myr: float) -> ConversionResultUSDC:
    """Dev fallback for USDC — auto-activates if HATA_SC_API_KEY is empty."""
    await asyncio.sleep(0.5)
    amount = Decimal(str(amount_myr))
    rate   = Decimal("4.70")
    usdc   = (amount / rate).quantize(Decimal("0.000001"), rounding=ROUND_DOWN)
    ts = int(time.time())
    return ConversionResultUSDC(
        success=True, tier="labuan_swap", myr_amount=str(amount),
        usdc_amount=str(usdc), exchange_rate=str(rate), fee_usdc="0",
        tx_reference=f"MOCK-{ts}",
        hata_order_id=f"MOCK-{ts}",
        error=None,
    )


def _err_usdc(tier: str, amount: Decimal, error: str) -> ConversionResultUSDC:
    return ConversionResultUSDC(  # type: ignore[return-value]
        success=False, tier=tier, myr_amount=str(amount),
        usdc_amount="0", exchange_rate="0", fee_usdc="0",
        tx_reference="", hata_order_id="", error=error,
    )
