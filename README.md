# Splash – B2B Cross-Border Payment Dashboard

Malaysian SMEs send MYR via FPX → recipients receive PHP in their local bank. All-in fee 1.5%, settlement under 5 minutes. Behind the scenes: MYR → USDC (Luno) → Sui blockchain → USDC → PHP (Coins.ph) → recipient bank.

**Test login:** `admin@splash.com` / `Splash@2026`

---

## Quick Start (Windows)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (for MongoDB)
- [Node.js 18+](https://nodejs.org)
- [Python 3.11+](https://python.org)

### One-Command Start

```powershell
.\start.ps1
```

This will:
1. Start MongoDB in Docker
2. Start the FastAPI backend at http://localhost:8001
3. Start the React frontend at http://localhost:3000

Then open **http://localhost:3000** and login with `admin@splash.com` / `Splash@2026`

---

## Manual Setup

### 1. Start MongoDB (Docker)

```powershell
docker-compose up -d
```

### 2. Install Dependencies

**Backend:**
```bash
pip install fastapi uvicorn motor pymongo bcrypt PyJWT python-dotenv "pydantic[email]" reportlab requests razorpay python-multipart starlette httpx
```

**Frontend:**
```bash
cd frontend
npm install
```

### 3. Start Services

**Backend** (terminal 1):
```bash
cd backend
uvicorn server:app --reload --port 8001
```

**Frontend** (terminal 2):
```bash
cd frontend
npm start
```

---

## Environment Variables

### `backend/.env`

| Variable | Value | Description |
|----------|-------|-------------|
| `MONGO_URL` | `mongodb://localhost:27017` | MongoDB connection (Docker) |
| `DB_NAME` | `splash` | Database name |
| `JWT_SECRET` | *(auto-generated)* | JWT signing secret |
| `SUI_PACKAGE_ID` | *(deployed)* | Sui testnet package ID |
| `SUI_REGISTRY_ID` | *(deployed)* | Sui registry object ID |
| `SUI_RPC_URL` | `https://fullnode.testnet.sui.io:443` | Sui testnet RPC |

### `frontend/.env`

| Variable | Value |
|----------|-------|
| `REACT_APP_BACKEND_URL` | `http://localhost:8001` |

---

## Sui Move Contract

**Status:** ✅ Deployed to Sui Testnet

- **Package ID**: `0xbfd9b35318e8588d45c9f1ce161da10462c61b40377e7f8c890196f5cba4ca51`
- **Registry ID**: `0x40c93719a1a67ee8eb5b7773a058047fde109de11852562fca2a7a26dc7997cb`
- **Explorer**: [View on Suiscan](https://suiscan.xyz/testnet/object/0xbfd9b35318e8588d45c9f1ce161da10462c61b40377e7f8c890196f5cba4ca51)

Every transfer now records a **real settlement on-chain** with hashed recipient PII.

---

## Project Structure

```
backend/
  server.py               FastAPI app — all routes
  services/
    curlec_service.py     Razorpay/Curlec FPX (graceful mock fallback)
    sui_service.py        Sui blockchain settlement (real testnet)
  .env                    Environment variables

frontend/
  src/
    pages/                Dashboard, SendPayout, Transfers, Recipients, Batch, Login
    components/ui/        Shadcn UI component library
    lib/
      api.js              Axios instance + helpers
      auth.jsx            Auth context (JWT + httpOnly cookie)

sui_contract/
  sources/settlement.move Sui Move package (splash::settlement module)
  build/                  Compiled bytecode

docker-compose.yml        MongoDB container config
start.ps1                 One-command startup script
```

---

## Stopping Services

```powershell
# Stop MongoDB
docker-compose down

# Stop backend/frontend: Ctrl+C in their terminals
```

---

## Design System

- **Colors:** Navy `#0A1E3F` · Cyan `#22A7F0` · Green `#00D2A0` · Amber `#FFB800`
- **Font:** Inter
- **Components:** Shadcn UI + Radix primitives + Tailwind CSS

---

## Features

✅ **Real Sui blockchain settlement** (testnet)  
✅ JWT authentication with httpOnly cookies  
✅ Live FX rates (MYR→PHP)  
✅ PDF receipts with branded layout  
✅ 5-stage transfer timeline with confetti  
✅ Batch CSV upload  
✅ Recipient management with duplicate detection  
✅ Auto-seeded demo data (12 recipients, 20 transfers)  

---

**Built with:** FastAPI · React 19 · MongoDB · Sui Move · Tailwind · Shadcn UI
