# Splash – Project Steering

## What This Is
Splash is a B2B cross-border payment dashboard for Malaysian SMEs sending MYR to PHP recipients. Stack: FastAPI + MongoDB backend, React 19 + Tailwind + Shadcn UI frontend, Sui Move smart contract for on-chain settlement receipts.

## Project Structure
```
backend/          FastAPI server (server.py) + services/
  .env            Environment variables (copy from .env.example or edit directly)
  services/
    curlec_service.py   Razorpay/Curlec FPX integration (mocked when keys absent)
    sui_service.py      Sui blockchain integration (mocked when keys absent)
frontend/         React app (craco + Tailwind + Shadcn)
  src/pages/      Route pages: Dashboard, SendPayout, Transfers, Recipients, Batch, Login
  src/components/ Layout + Shadcn UI components
  src/lib/        api.js (axios), auth.jsx (context), utils.js
sui_contract/     Sui Move package (splash::settlement module)
scripts/          deploy_sui.py — one-shot Sui testnet deployer
memory/PRD.md     Full product requirements document
```

## Running the Project

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+ (3.14 works for core packages)
- MongoDB running locally on port 27017 (or set MONGO_URL in backend/.env)

### Backend
```bash
# From repo root
pip install fastapi uvicorn motor pymongo bcrypt PyJWT python-dotenv pydantic "pydantic[email]" reportlab requests razorpay python-multipart starlette
# Edit backend/.env — set MONGO_URL, DB_NAME, JWT_SECRET at minimum
python -m uvicorn server:app --reload --port 8001
```
Backend runs at http://localhost:8001

### Frontend
```bash
# From frontend/
npm install
npm start
```
Frontend runs at http://localhost:3000 and proxies /api → http://localhost:8001

### Sui Move Contract (optional — app works without it)
```bash
# Requires `sui` CLI in PATH
python scripts/deploy_sui.py
# Writes SUI_PACKAGE_ID + SUI_REGISTRY_ID to backend/.env
```

## Environment Variables (backend/.env)
| Variable | Required | Description |
|---|---|---|
| MONGO_URL | ✅ | MongoDB connection string |
| DB_NAME | ✅ | Database name (e.g. `splash`) |
| JWT_SECRET | ✅ | Long random string for JWT signing |
| RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET | optional | Real FPX via Curlec; mocked if absent |
| SUI_PACKAGE_ID / SUI_REGISTRY_ID / SUI_PRIVATE_KEY | optional | Real Sui settlement; mocked if absent |
| RESEND_API_KEY | optional | Email notifications; console-logged if absent |
| TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM | optional | SMS notifications; console-logged if absent |

## Test Credentials
- Admin: `admin@splash.com` / `Splash@2026`
- Auto-seeded on first login: 12 PH recipients + 20 transfers

## Design Tokens
- Navy: `#0A1E3F` · Cyan: `#22A7F0` · Green: `#00D2A0` · Amber: `#FFB800`
- Font: Inter
- Component library: Shadcn UI (components in `frontend/src/components/ui/`)

## Key Patterns
- All API calls go through `frontend/src/lib/api.js` (axios instance with baseURL `/api`)
- Auth state lives in `frontend/src/lib/auth.jsx` (React context + httpOnly cookie)
- Backend services degrade gracefully — Curlec, Sui, Resend, Twilio all have mock fallbacks
- FX rate cached 10 min from open.er-api.com, fallback 12.9822 MYR/PHP
