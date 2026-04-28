# Splash Move Package

A real Sui Move package that records every Splash cross-border settlement on chain.
See `sources/settlement.move` for the contract.

## Deploying to testnet

Prerequisites:
- Sui CLI installed (`brew install sui` or download a release from
  https://github.com/MystenLabs/sui/releases). pysui shells out to it for
  publishing.
- ~2 SUI on testnet. The bundled deploy script will request faucet drops.

```bash
cd /app
python scripts/deploy_sui.py
```

This will:
1. Generate (or reuse) a deployer keypair and persist it in `backend/.env` as
   `SUI_PRIVATE_KEY` (Bech32 `suiprivkey…` format).
2. Top up the address from the testnet faucet.
3. `sui move build` and publish the package.
4. Write `SUI_PACKAGE_ID` and `SUI_REGISTRY_ID` back to `backend/.env`.

Once those three env vars are set, the backend will switch from the mock Sui
hash to a real `record_settlement` call on every payout. If they are missing,
the app silently falls back to the demo mock — nothing breaks.

## Reading the Registry

```bash
sui client object $SUI_REGISTRY_ID --json | jq '.content.fields'
```

Returns lifetime totals: number of settlements, MYR minor units, PHP minor units.
