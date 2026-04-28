#!/usr/bin/env python3
"""Splash · One-shot Sui Move package deployer.

Generates (or reuses) a deployer keypair, tops it up from the testnet faucet,
builds + publishes ``/app/sui_contract``, and writes the resulting
``SUI_PACKAGE_ID`` + ``SUI_REGISTRY_ID`` back into ``backend/.env``.

Run:  python scripts/deploy_sui.py

Requirements: ``sui`` CLI binary in PATH (used by pysui for `move build`)."""
from __future__ import annotations

import os
import re
import sys
import json
import time
import shutil
import pathlib
import subprocess
from typing import Optional

import httpx

ROOT = pathlib.Path(__file__).resolve().parent.parent
ENV_PATH = ROOT / "backend" / ".env"
PACKAGE_DIR = ROOT / "sui_contract"
TESTNET_RPC = "https://fullnode.testnet.sui.io:443"
FAUCET_URLS = [
    "https://faucet.testnet.sui.io/v2/gas",
    "https://faucet.testnet.sui.io/gas",
]


def _read_env() -> dict:
    if not ENV_PATH.exists():
        return {}
    out = {}
    for line in ENV_PATH.read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, _, v = line.partition("=")
            out[k.strip()] = v.strip().strip('"')
    return out


def _write_env(updates: dict) -> None:
    env = _read_env()
    env.update(updates)
    ENV_PATH.write_text("\n".join(f'{k}="{v}"' for k, v in env.items()) + "\n")


def ensure_keypair(env: dict) -> tuple[str, str]:
    """Return (bech32_private_key, sui_address)."""
    if env.get("SUI_PRIVATE_KEY") and env.get("SUI_ADDRESS"):
        print(f"reusing keypair {env['SUI_ADDRESS']}")
        return env["SUI_PRIVATE_KEY"], env["SUI_ADDRESS"]

    from pysui.sui.sui_crypto import create_new_keypair, SignatureScheme
    mnemonic, kp = create_new_keypair(scheme=SignatureScheme.ED25519)
    address = kp.to_sui_address()
    privkey = kp.serialize()  # bech32 suiprivkey…
    _write_env({
        "SUI_PRIVATE_KEY": privkey,
        "SUI_ADDRESS": address,
        "SUI_MNEMONIC": mnemonic,
    })
    print(f"generated new keypair {address}")
    return privkey, address


def fund_address(address: str) -> None:
    print(f"requesting faucet drops for {address} ...")
    for url in FAUCET_URLS:
        try:
            r = httpx.post(url, json={"FixedAmountRequest": {"recipient": address}}, timeout=15)
            if r.status_code in (200, 201, 202):
                print(f"  faucet ok ({url})")
                time.sleep(3)
                return
            print(f"  faucet {url} -> {r.status_code}: {r.text[:120]}")
        except Exception as e:
            print(f"  faucet {url} error: {e}")
    print("  WARNING: faucet failed — fund the address manually before retrying")


def publish_package(privkey: str) -> tuple[Optional[str], Optional[str]]:
    """Build + publish via sui CLI; returns (package_id, registry_object_id)."""
    if shutil.which("sui") is None:
        print("ERROR: `sui` CLI not found in PATH.")
        print("Install it from https://github.com/MystenLabs/sui/releases or `brew install sui`")
        return None, None

    print("publishing package via sui client publish ...")
    # Configure the sui CLI to use our keypair just for this run.
    from pysui import SuiConfig, SyncClient
    from pysui.sui.sui_txn import SyncTransaction
    cfg = SuiConfig.user_config(rpc_url=TESTNET_RPC, prv_keys=[privkey])
    client = SyncClient(cfg)
    try:
        result = client.publish_package(package_path=str(PACKAGE_DIR), gas_budget="200000000")
    except Exception as e:
        print(f"publish error: {e}")
        return None, None
    if not result.is_ok():
        print(f"publish failed: {result.result_string}")
        return None, None
    data = result.result_data
    package_id = None
    registry_id = None
    for change in (getattr(data, "object_changes", []) or []):
        change_type = getattr(change, "type_", getattr(change, "type", ""))
        obj_type = str(getattr(change, "object_type", ""))
        if change_type == "published":
            package_id = getattr(change, "package_id", None) or getattr(change, "object_id", None)
        if change_type == "created" and obj_type.endswith("::settlement::Registry"):
            registry_id = getattr(change, "object_id", None)
    print(f"  package_id={package_id}\n  registry_id={registry_id}\n  digest={data.digest}")
    return package_id, registry_id


def main() -> int:
    env = _read_env()
    privkey, address = ensure_keypair(env)
    fund_address(address)
    package_id, registry_id = publish_package(privkey)
    if not package_id or not registry_id:
        print("\nDeploy did not complete. The backend will keep using the mock Sui hash.")
        return 1
    _write_env({"SUI_PACKAGE_ID": package_id, "SUI_REGISTRY_ID": registry_id})
    print("\nSuccess. Restart backend with:  sudo supervisorctl restart backend")
    return 0


if __name__ == "__main__":
    sys.exit(main())
