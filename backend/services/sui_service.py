"""Splash backend integration for the Sui Move settlement contract.

Uses the `sui` CLI binary to submit transactions — no pysui dependency needed.
If SUI_PACKAGE_ID + SUI_REGISTRY_ID + SUI_PRIVATE_KEY are present in env, every
call to ``record_settlement_async`` will publish a real on-chain transaction
on Sui testnet and return its digest. Otherwise returns None (mock hash used).
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
from typing import Optional

logger = logging.getLogger(__name__)

SUI_TESTNET_RPC = os.environ.get("SUI_RPC_URL", "https://fullnode.testnet.sui.io:443")
SUI_EXPLORER_BASE = "https://suiscan.xyz/testnet/tx"


def explorer_url(digest: str) -> str:
    return f"{SUI_EXPLORER_BASE}/{digest}"


def is_configured() -> bool:
    return bool(
        os.environ.get("SUI_PACKAGE_ID")
        and os.environ.get("SUI_REGISTRY_ID")
        and os.environ.get("SUI_PRIVATE_KEY")
        and shutil.which("sui")  # sui CLI must be in PATH
    )


def recipient_hash(name: str, bank: str, account: str) -> bytes:
    payload = f"{name}|{bank}|{account}".encode("utf-8")
    return hashlib.sha256(payload).digest()


def _record_sync(
    ref_id: str,
    myr_minor: int,
    php_minor: int,
    rate_bp: int,
    recipient_hash_bytes: bytes,
) -> Optional[str]:
    """Call record_settlement via sui CLI. Returns tx digest or None on failure."""
    package_id = os.environ.get("SUI_PACKAGE_ID", "")
    registry_id = os.environ.get("SUI_REGISTRY_ID", "")
    private_key = os.environ.get("SUI_PRIVATE_KEY", "")

    if not (package_id and registry_id and private_key):
        logger.warning("Sui not configured — skipping on-chain record")
        return None

    # Convert bytes to comma-separated decimal list for Move vector<u8>
    ref_bytes = ",".join(str(b) for b in ref_id.encode("utf-8"))
    hash_bytes = ",".join(str(b) for b in recipient_hash_bytes)

    # Write a temporary keystore so the CLI uses our key
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

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60,
            env=env,
        )

        if result.returncode != 0:
            logger.warning(f"sui CLI call failed: {result.stderr[:500]}")
            return None

        # Parse the JSON output for the digest
        try:
            data = json.loads(result.stdout)
            digest = data.get("digest") or data.get("effects", {}).get("transactionDigest")
            if digest:
                logger.info(f"[SUI] record_settlement digest={digest} ref={ref_id}")
                return digest
            logger.warning(f"sui CLI: no digest in output: {result.stdout[:300]}")
            return None
        except json.JSONDecodeError:
            # Try to extract digest from plain text output
            for line in result.stdout.splitlines():
                if "digest" in line.lower() or "transaction" in line.lower():
                    parts = line.split()
                    for part in parts:
                        if len(part) > 30 and not part.startswith("0x"):
                            logger.info(f"[SUI] extracted digest={part} ref={ref_id}")
                            return part
            logger.warning(f"sui CLI: could not parse output: {result.stdout[:300]}")
            return None

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


async def record_settlement_async(
    ref_id: str,
    myr_minor: int,
    php_minor: int,
    rate_bp: int,
    recipient_hash_bytes: bytes,
) -> Optional[str]:
    """Non-blocking wrapper. Returns digest or None when unconfigured / failed."""
    if not is_configured():
        return None
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        _record_sync,
        ref_id, myr_minor, php_minor, rate_bp, recipient_hash_bytes,
    )
