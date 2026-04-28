#!/usr/bin/env python3
"""Splash · Sui Move package deployer using sui CLI directly.

Builds + publishes the contract using the active sui client address,
and writes SUI_PACKAGE_ID + SUI_REGISTRY_ID back into backend/.env.

Run:  python scripts/deploy_sui_cli.py

Requirements: `sui` CLI binary in PATH with an active address funded on testnet."""
from __future__ import annotations

import os
import re
import sys
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
ENV_PATH = ROOT / "backend" / ".env"
PACKAGE_DIR = ROOT / "sui_contract"


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


def get_active_address() -> str:
    """Get the active sui client address."""
    result = subprocess.run(
        ["sui", "client", "active-address"],
        capture_output=True,
        text=True,
        cwd=str(ROOT),
    )
    if result.returncode != 0:
        print(f"ERROR: Failed to get active address: {result.stderr}")
        sys.exit(1)
    address = result.stdout.strip().split("\n")[0]  # First line is the address
    print(f"Active address: {address}")
    return address


def check_gas_balance() -> None:
    """Check if the active address has enough gas."""
    result = subprocess.run(
        ["sui", "client", "gas"],
        capture_output=True,
        text=True,
        cwd=str(ROOT),
    )
    if result.returncode != 0:
        print(f"WARNING: Could not check gas balance: {result.stderr}")
        return
    # Parse the output to check balance
    if "suiBalance" in result.stdout or "SUI" in result.stdout:
        print("Gas balance check: OK")
    else:
        print("WARNING: Low or no gas balance. Request funds from https://faucet.sui.io/")


def publish_package() -> tuple[str | None, str | None]:
    """Build + publish via sui CLI; returns (package_id, registry_object_id)."""
    print(f"Publishing package from {PACKAGE_DIR}...")
    
    # Run sui client publish with JSON output
    result = subprocess.run(
        ["sui", "client", "publish", "--gas-budget", "200000000", "--json"],
        capture_output=True,
        text=True,
        cwd=str(PACKAGE_DIR),
    )
    
    if result.returncode != 0:
        print(f"ERROR: Publish failed: {result.stderr}")
        return None, None
    
    try:
        data = json.loads(result.stdout)
        
        # Extract package ID and registry object ID from the response
        package_id = None
        registry_id = None
        
        # Look in objectChanges for the published package and created Registry
        for change in data.get("objectChanges", []):
            change_type = change.get("type")
            
            if change_type == "published":
                package_id = change.get("packageId")
                print(f"  Package ID: {package_id}")
            
            if change_type == "created":
                obj_type = change.get("objectType", "")
                if "settlement::Registry" in obj_type:
                    registry_id = change.get("objectId")
                    print(f"  Registry ID: {registry_id}")
        
        digest = data.get("digest")
        print(f"  Transaction digest: {digest}")
        
        return package_id, registry_id
        
    except json.JSONDecodeError as e:
        print(f"ERROR: Failed to parse publish output: {e}")
        print(f"Output was: {result.stdout[:500]}")
        return None, None


def main() -> int:
    address = get_active_address()
    check_gas_balance()
    
    package_id, registry_id = publish_package()
    
    if not package_id or not registry_id:
        print("\nDeploy did not complete. The backend will keep using the mock Sui hash.")
        return 1
    
    # Get the private key from sui client export (if available)
    # For now, we'll just save the address
    _write_env({
        "SUI_PACKAGE_ID": package_id,
        "SUI_REGISTRY_ID": registry_id,
        "SUI_ADDRESS": address,
    })
    
    print(f"\n✓ Success! Contract deployed to testnet.")
    print(f"  Package ID: {package_id}")
    print(f"  Registry ID: {registry_id}")
    print(f"\nUpdated backend/.env with deployment info.")
    print("Restart the backend to use the real Sui settlement.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
