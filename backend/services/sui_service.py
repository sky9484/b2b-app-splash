"""
sui_service.py — Sui blockchain settlement integration.

Uses the existing sui CLI binary for signing when SUI_PRIVATE_KEY is configured.
Never raises — all errors are returned in the result dict so callers can decide
whether to fail the transfer or mark it settlement_pending.

Explorer URL fix: links use the transaction DIGEST, not the package ID.
  ✓ suiscan.xyz/testnet/tx/{digest}
  ✓ suivision.xyz/txblock/{digest}?network=testnet
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import shutil
import subprocess
import tempfile
from typing import TypedDict, Optional

import httpx

logger = logging.getLogger(__name__)

SUI_PACKAGE_ID  = os.environ.get("SUI_PACKAGE_ID", "")
SUI_REGISTRY_ID = os.environ.get("SUI_REGISTRY_ID", "")
SUI_RPC_URL     = os.environ.get("SUI_RPC_URL", "https://fullnode.testnet.sui.io:443")
SUI_ADDRESS     = os.environ.get("SUI_ADDRESS", "")
TESTNET_SCAN    = "https://suiscan.xyz/testnet/tx"
TESTNET_VISION  = "https://suivision.xyz/txblock"
NETWORK         = "testnet"


class SuiSettlementResult(TypedDict):
    success: bool
    tx_digest: "str | None"
    explorer_url: "str | None"
    vision_url: "str | None"
    gas_used: "str | None"
    error: "str | None"
    error_code: "str | None"


def is_configured() -> bool:
    return bool(
        os.environ.get("SUI_PACKAGE_ID")
        and os.environ.get("SUI_REGISTRY_ID")
        and os.environ.get("SUI_PRIVATE_KEY")
        and shutil.which("sui")
    )


def explorer_url(digest: str) -> str:
    """Return the correct suiscan URL for a transaction digest (not a package ID)."""
    return f"{TESTNET_SCAN}/{digest}"


def vision_url(digest: str) -> str:
    """Return the correct Sui Vision URL for a transaction digest."""
    return f"{TESTNET_VISION}/{digest}?network={NETWORK}"


def recipient_hash(name: str, bank: str, account: str) -> bytes:
    payload = f"{name}|{bank}|{account}".encode("utf-8")
    return hashlib.sha256(payload).digest()


# ── New-style record_settlement (used by Workstream 4 server.py path) ────────

async def record_settlement(
    transfer_id: str,
    amount_usdt: str,
    recipient_hash_str: str,
    max_retries: int = 3,
) -> SuiSettlementResult:
    """
    Never raises — caller checks result['success'].
    Uses retry with exponential back-off (2s, 4s).
    """
    last_error: Optional[str] = None

    for attempt in range(1, max_retries + 1):
        try:
            # Pre-flight: check gas balance
            gas = await _check_gas_balance()
            if gas < 0.1:
                return SuiSettlementResult(
                    success=False, tx_digest=None, explorer_url=None, vision_url=None,
                    gas_used=None,
                    error=f"Insufficient gas: {gas:.4f} SUI. Fund address: {SUI_ADDRESS}",
                    error_code="INSUFFICIENT_GAS",
                )

            # Execute Move call via CLI (reuses existing _record_sync logic)
            digest = await _run_cli_async(transfer_id, amount_usdt, recipient_hash_str)
            if not digest:
                raise ValueError("CLI returned no digest")

            return SuiSettlementResult(
                success=True,
                tx_digest=digest,
                explorer_url=f"{TESTNET_SCAN}/{digest}",
                vision_url=f"{TESTNET_VISION}/{digest}?network={NETWORK}",
                gas_used=None,  # CLI output parsing for gas is best-effort
                error=None,
                error_code=None,
            )

        except Exception as e:
            last_error = str(e)
            logger.warning(f"Sui attempt {attempt}/{max_retries}: {e}")
            if attempt < max_retries:
                await asyncio.sleep(2 ** attempt)  # 2s, 4s

    return SuiSettlementResult(
        success=False, tx_digest=None, explorer_url=None, vision_url=None, gas_used=None,
        error=f"Failed after {max_retries} attempts. Last: {last_error}",
        error_code="SUI_MAX_RETRIES_EXCEEDED",
    )


# ── Legacy async wrapper (used by existing advance_transfer endpoint) ─────────

async def record_settlement_async(
    ref_id: str,
    myr_minor: int,
    php_minor: int,
    rate_bp: int,
    recipient_hash_bytes: bytes,
) -> Optional[str]:
    """Non-blocking wrapper for the existing advance_transfer flow. Returns digest or None."""
    if not is_configured():
        return None
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        _record_sync,
        ref_id, myr_minor, php_minor, rate_bp, recipient_hash_bytes,
    )


# ── Gas balance check ─────────────────────────────────────────────────────────

async def _check_gas_balance() -> float:
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.post(SUI_RPC_URL, json={
            "jsonrpc": "2.0", "id": 1,
            "method": "suix_getBalance",
            "params": [SUI_ADDRESS, "0x2::sui::SUI"],
        })
        r.raise_for_status()
        mist = int(r.json()["result"]["totalBalance"])
        return mist / 1_000_000_000


# ── CLI helpers ───────────────────────────────────────────────────────────────

async def _run_cli_async(transfer_id: str, amount_usdt: str, recipient_hash_str: str) -> Optional[str]:
    """Async wrapper around the CLI call for the new record_settlement path."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        _cli_call_simple,
        transfer_id, amount_usdt, recipient_hash_str,
    )


def _cli_call_simple(transfer_id: str, amount_usdt: str, recipient_hash_str: str) -> Optional[str]:
    package_id  = os.environ.get("SUI_PACKAGE_ID", "")
    registry_id = os.environ.get("SUI_REGISTRY_ID", "")
    private_key = os.environ.get("SUI_PRIVATE_KEY", "")

    if not (package_id and registry_id and private_key):
        return None

    ref_bytes  = ",".join(str(b) for b in transfer_id.encode("utf-8"))
    hash_bytes = ",".join(str(b) for b in recipient_hash_str.encode("utf-8"))

    keystore = {"keys": [private_key]}
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(keystore, f)
        keystore_path = f.name

    try:
        cmd = [
            "sui", "client", "call",
            "--package", package_id,
            "--module", "settlement",
            "--function", "record_settlement",
            "--args",
                registry_id,
                f"[{ref_bytes}]",
                amount_usdt,
                f"[{hash_bytes}]",
            "--gas-budget", "20000000",
            "--json",
        ]
        env = os.environ.copy()
        env["SUI_KEYSTORE_PATH"] = keystore_path
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60, env=env)
        if result.returncode != 0:
            logger.warning(f"sui CLI failed: {result.stderr[:500]}")
            return None
        return _parse_digest(result.stdout)
    except subprocess.TimeoutExpired:
        logger.warning("sui CLI timed out after 60s")
        return None
    except Exception as e:
        logger.warning(f"sui CLI error: {e}")
        return None
    finally:
        try:
            os.unlink(keystore_path)
        except Exception:
            pass


def _record_sync(
    ref_id: str,
    myr_minor: int,
    php_minor: int,
    rate_bp: int,
    recipient_hash_bytes: bytes,
) -> Optional[str]:
    """Legacy sync call used by record_settlement_async (advance_transfer flow)."""
    package_id  = os.environ.get("SUI_PACKAGE_ID", "")
    registry_id = os.environ.get("SUI_REGISTRY_ID", "")
    private_key = os.environ.get("SUI_PRIVATE_KEY", "")

    if not (package_id and registry_id and private_key):
        logger.warning("Sui not configured — skipping on-chain record")
        return None

    ref_bytes  = ",".join(str(b) for b in ref_id.encode("utf-8"))
    hash_bytes = ",".join(str(b) for b in recipient_hash_bytes)

    keystore = {"keys": [private_key]}
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(keystore, f)
        keystore_path = f.name

    try:
        cmd = [
            "sui", "client", "call",
            "--package", package_id,
            "--module", "settlement",
            "--function", "record_settlement",
            "--args",
                registry_id,
                f"[{ref_bytes}]",
                str(myr_minor),
                str(php_minor),
                str(rate_bp),
                f"[{hash_bytes}]",
            "--gas-budget", "20000000",
            "--json",
        ]
        env = os.environ.copy()
        env["SUI_KEYSTORE_PATH"] = keystore_path
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60, env=env)
        if result.returncode != 0:
            logger.warning(f"sui CLI call failed: {result.stderr[:500]}")
            return None
        digest = _parse_digest(result.stdout)
        if digest:
            logger.info(f"[SUI] record_settlement digest={digest} ref={ref_id}")
        return digest
    except subprocess.TimeoutExpired:
        logger.warning("sui CLI call timed out after 60s")
        return None
    except Exception as e:
        logger.warning(f"sui record_settlement failed: {e}")
        return None
    finally:
        try:
            os.unlink(keystore_path)
        except Exception:
            pass


def _parse_digest(stdout: str) -> Optional[str]:
    try:
        data = json.loads(stdout)
        digest = (
            data.get("digest")
            or data.get("result", {}).get("digest")
            or data.get("effects", {}).get("transactionDigest")
        )
        if digest:
            return digest
    except json.JSONDecodeError:
        pass
    # Fallback: scan lines for a base58-looking token
    for line in stdout.splitlines():
        if "digest" in line.lower() or "transaction" in line.lower():
            for part in line.split():
                if len(part) > 30 and not part.startswith("0x"):
                    return part
    logger.warning(f"sui CLI: could not parse digest from output: {stdout[:300]}")
    return None
