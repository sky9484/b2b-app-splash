"""Splash backend integration for the Sui Move settlement contract.

If SUI_PACKAGE_ID + SUI_REGISTRY_ID + SUI_PRIVATE_KEY are present in env, every
call to ``record_settlement_async`` will publish a real on-chain transaction
on Sui testnet and return its digest. Otherwise it returns ``None`` and the
caller falls back to a mock hash (this keeps the demo running with zero setup).
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import os
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
    """Blocking pysui call. Returns tx digest or None on failure."""
    try:
        from pysui import SuiConfig, SyncClient
        from pysui.sui.sui_txn import SyncTransaction
        from pysui.sui.sui_types.scalars import ObjectID, SuiU64, SuiString
    except Exception as e:  # pragma: no cover
        logger.warning(f"pysui import failed: {e}")
        return None

    package_id = os.environ["SUI_PACKAGE_ID"]
    registry_id = os.environ["SUI_REGISTRY_ID"]
    privkey = os.environ["SUI_PRIVATE_KEY"]

    try:
        cfg = SuiConfig.user_config(
            rpc_url=SUI_TESTNET_RPC,
            prv_keys=[privkey],
        )
        client = SyncClient(cfg)
        txer = SyncTransaction(client=client)
        txer.move_call(
            target=f"{package_id}::settlement::record_settlement",
            arguments=[
                ObjectID(registry_id),
                list(ref_id.encode("utf-8")),
                SuiU64(myr_minor),
                SuiU64(php_minor),
                SuiU64(rate_bp),
                list(recipient_hash_bytes),
            ],
            type_arguments=[],
        )
        result = txer.execute(gas_budget="20000000")
        if not result.is_ok():
            logger.warning(f"sui execute err: {result.result_string}")
            return None
        digest = result.result_data.digest
        logger.info(f"[SUI] record_settlement digest={digest} ref={ref_id}")
        return digest
    except Exception as e:
        logger.warning(f"sui record_settlement failed: {e}")
        return None


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
