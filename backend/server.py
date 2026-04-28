from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import random
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
import requests
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ---------- Setup ----------
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_TTL_MIN = 60 * 24  # 1 day for demo

app = FastAPI(title="Splash API")
api = APIRouter(prefix="/api")

# ---------- Auth helpers ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id, "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_TTL_MIN),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token", value=token, httponly=True,
        secure=True, samesite="none",
        max_age=ACCESS_TOKEN_TTL_MIN * 60, path="/",
    )

# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    company: Optional[str] = None

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class RecipientIn(BaseModel):
    name: str
    country: str = "PH"
    bank: str
    account_number: str
    mobile: Optional[str] = None
    save: bool = True

class TransferIn(BaseModel):
    recipient_id: str
    send_amount_myr: float
    reference: Optional[str] = None
    note: Optional[str] = None

class QuoteIn(BaseModel):
    send_amount_myr: float

class BatchTransferIn(BaseModel):
    rows: List[dict]  # {name, bank, account_number, amount_myr, reference?}

# ---------- FX Rate ----------
_fx_cache = {"rate": None, "ts": None}
def fetch_fx_rate() -> float:
    """Return MYR -> PHP rate. Caches for 10 min. Falls back to 12.9822."""
    global _fx_cache
    now = datetime.now(timezone.utc)
    if _fx_cache["rate"] and _fx_cache["ts"] and (now - _fx_cache["ts"]).total_seconds() < 600:
        return _fx_cache["rate"]
    try:
        r = requests.get("https://open.er-api.com/v6/latest/MYR", timeout=4)
        data = r.json()
        rate = float(data["rates"]["PHP"])
        _fx_cache = {"rate": rate, "ts": now}
        return rate
    except Exception as e:
        logger.warning(f"FX fetch failed, using fallback: {e}")
        return _fx_cache["rate"] or 12.9822

def calc_quote(amount_myr: float):
    rate = fetch_fx_rate()
    fx_spread = round(amount_myr * 0.012, 2)
    platform_fee = round(amount_myr * 0.002, 2)
    fixed_fee = 4.50
    total_fee = round(fx_spread + platform_fee + fixed_fee, 2)
    net_myr = max(amount_myr - total_fee, 0)
    receive_php = round(net_myr * rate, 2)
    return {
        "send_amount_myr": round(amount_myr, 2),
        "receive_amount_php": receive_php,
        "rate": round(rate, 4),
        "fx_spread": fx_spread,
        "platform_fee": platform_fee,
        "fixed_fee": fixed_fee,
        "total_fee": total_fee,
        "total_debit_myr": round(amount_myr, 2),
        "quote_expires_at": (datetime.now(timezone.utc) + timedelta(seconds=30)).isoformat(),
    }

# ---------- Auth Endpoints ----------
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id, "email": email, "name": body.name, "company": body.company or "",
        "password_hash": hash_password(body.password), "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    await seed_user_data(user_id)
    token = create_access_token(user_id, email)
    set_auth_cookie(response, token)
    return {"id": user_id, "email": email, "name": body.name, "company": body.company or "", "token": token}

@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], email)
    set_auth_cookie(response, token)
    return {
        "id": user["id"], "email": user["email"], "name": user.get("name", ""),
        "company": user.get("company", ""), "token": token,
    }

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user

# ---------- FX & Quote ----------
@api.get("/fx-rate")
async def fx_rate():
    return {"pair": "MYR/PHP", "rate": round(fetch_fx_rate(), 4), "fetched_at": datetime.now(timezone.utc).isoformat()}

@api.post("/quote")
async def quote(body: QuoteIn, user=Depends(get_current_user)):
    if body.send_amount_myr < 100 or body.send_amount_myr > 100000:
        raise HTTPException(status_code=400, detail="Amount must be between RM 100 and RM 100,000")
    return calc_quote(body.send_amount_myr)

# ---------- Recipients ----------
@api.get("/recipients")
async def list_recipients(user=Depends(get_current_user)):
    rows = await db.recipients.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    # attach stats
    for r in rows:
        agg = await db.transfers.aggregate([
            {"$match": {"user_id": user["id"], "recipient_id": r["id"], "status": "completed"}},
            {"$group": {"_id": None, "total": {"$sum": "$send_amount_myr"}, "count": {"$sum": 1},
                        "last_amount": {"$last": "$send_amount_myr"}, "last_at": {"$last": "$created_at"}}}
        ]).to_list(1)
        if agg:
            r["total_sent_myr"] = round(agg[0]["total"], 2)
            r["total_count"] = agg[0]["count"]
            r["last_amount_myr"] = round(agg[0]["last_amount"], 2)
            r["last_sent_at"] = agg[0]["last_at"]
        else:
            r["total_sent_myr"] = 0
            r["total_count"] = 0
            r["last_amount_myr"] = None
            r["last_sent_at"] = None
    return rows

@api.post("/recipients")
async def create_recipient(body: RecipientIn, user=Depends(get_current_user)):
    rid = str(uuid.uuid4())
    doc = {
        "id": rid, "user_id": user["id"], "name": body.name, "country": body.country,
        "bank": body.bank, "account_number": body.account_number, "mobile": body.mobile or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.recipients.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.delete("/recipients/{rid}")
async def delete_recipient(rid: str, user=Depends(get_current_user)):
    await db.recipients.delete_one({"id": rid, "user_id": user["id"]})
    return {"ok": True}

# ---------- Transfers ----------
def gen_reference() -> str:
    today = datetime.now(timezone.utc).strftime("%y%m%d")
    rand = random.randint(100, 999)
    return f"SPL{today}{rand:03d}"

@api.get("/transfers")
async def list_transfers(
    user=Depends(get_current_user),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = 200,
):
    q = {"user_id": user["id"]}
    if status and status != "all":
        q["status"] = status
    if search:
        q["$or"] = [
            {"recipient_name": {"$regex": search, "$options": "i"}},
            {"reference": {"$regex": search, "$options": "i"}},
        ]
    rows = await db.transfers.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return rows

@api.get("/transfers/stats")
async def transfer_stats(user=Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    rows = await db.transfers.find({"user_id": user["id"]}, {"_id": 0}).to_list(2000)
    total_month = sum(r["send_amount_myr"] for r in rows if r["status"] == "completed" and r["created_at"] >= month_start)
    pending = sum(1 for r in rows if r["status"] == "pending")
    completed = [r for r in rows if r["status"] == "completed"]
    avg_seconds = 222  # default 3m 42s
    if completed:
        avg_seconds = int(sum(r.get("settlement_seconds", 222) for r in completed) / len(completed))
    recipients = await db.recipients.count_documents({"user_id": user["id"]})
    return {
        "total_sent_myr_month": round(total_month, 2),
        "active_recipients": recipients,
        "pending_transfers": pending,
        "avg_settlement_seconds": avg_seconds,
    }

@api.post("/transfers")
async def create_transfer(body: TransferIn, user=Depends(get_current_user)):
    rec = await db.recipients.find_one({"id": body.recipient_id, "user_id": user["id"]}, {"_id": 0})
    if not rec:
        raise HTTPException(status_code=404, detail="Recipient not found")
    q = calc_quote(body.send_amount_myr)
    tid = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    doc = {
        "id": tid, "user_id": user["id"], "recipient_id": rec["id"],
        "recipient_name": rec["name"], "recipient_bank": rec["bank"],
        "recipient_account": rec["account_number"],
        "send_amount_myr": q["send_amount_myr"], "receive_amount_php": q["receive_amount_php"],
        "rate": q["rate"], "total_fee_myr": q["total_fee"],
        "fx_spread": q["fx_spread"], "platform_fee": q["platform_fee"], "fixed_fee": q["fixed_fee"],
        "reference": body.reference or gen_reference(),
        "note": body.note or "",
        "status": "pending",
        "settlement_seconds": random.randint(180, 300),
        "created_at": now.isoformat(),
        "stages": [
            {"key": "fpx", "label": "FPX payment received", "desc": "Your bank transfer completed successfully", "done": True, "ts": now.isoformat()},
            {"key": "luno", "label": "MYR converted to USDC on Luno", "desc": f"{q['send_amount_myr']:.2f} MYR → {round(q['send_amount_myr']/19.4, 2)} USDC", "done": True, "ts": (now + timedelta(seconds=20)).isoformat()},
            {"key": "sui", "label": "USDC settled on Sui blockchain", "desc": f"Settlement hash: 0x{uuid.uuid4().hex[:8]}...{uuid.uuid4().hex[:4]}", "done": True, "ts": (now + timedelta(seconds=40)).isoformat()},
            {"key": "coins", "label": "USDC converted to PHP on Coins.ph", "desc": f"Processing → {q['receive_amount_php']:.2f} PHP", "done": False, "ts": None},
            {"key": "bank", "label": f"Sent to recipient's {rec['bank']} account", "desc": "Awaiting bank confirmation", "done": False, "ts": None},
        ],
    }
    await db.transfers.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.post("/transfers/{tid}/advance")
async def advance_transfer(tid: str, user=Depends(get_current_user)):
    """Demo helper: marks next pending stage done. Frontend polls this every few seconds."""
    t = await db.transfers.find_one({"id": tid, "user_id": user["id"]}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Transfer not found")
    stages = t["stages"]
    now = datetime.now(timezone.utc).isoformat()
    advanced = False
    for s in stages:
        if not s["done"]:
            s["done"] = True
            s["ts"] = now
            advanced = True
            break
    new_status = "completed" if all(s["done"] for s in stages) else "pending"
    await db.transfers.update_one({"id": tid}, {"$set": {"stages": stages, "status": new_status}})
    t["stages"] = stages
    t["status"] = new_status
    return t

@api.get("/transfers/{tid}")
async def get_transfer(tid: str, user=Depends(get_current_user)):
    t = await db.transfers.find_one({"id": tid, "user_id": user["id"]}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Transfer not found")
    return t

# ---------- Batch ----------
@api.post("/batch/preview")
async def batch_preview(body: BatchTransferIn, user=Depends(get_current_user)):
    rate = fetch_fx_rate()
    rows_out = []
    total_send = 0.0
    total_fee = 0.0
    for row in body.rows[:30]:
        try:
            amt = float(row.get("amount_myr", 0))
        except Exception:
            amt = 0
        q = calc_quote(amt) if amt >= 100 else None
        rows_out.append({
            "name": row.get("name", ""),
            "bank": row.get("bank", ""),
            "account_number": row.get("account_number", ""),
            "amount_myr": amt,
            "valid": q is not None,
            "receive_php": q["receive_amount_php"] if q else 0,
            "fee_myr": q["total_fee"] if q else 0,
        })
        if q:
            total_send += amt
            total_fee += q["total_fee"]
    return {
        "rows": rows_out,
        "rate": round(rate, 4),
        "count": len(rows_out),
        "valid_count": sum(1 for r in rows_out if r["valid"]),
        "total_send_myr": round(total_send, 2),
        "total_fee_myr": round(total_fee, 2),
    }

# ---------- Seeds ----------
PH_NAMES = [
    "Juan Dela Cruz", "Maria Santos", "Jose Reyes", "Ana Garcia",
    "Carlos Mendoza", "Sofia Torres", "Miguel Ramos", "Isabella Cruz",
    "Diego Aquino", "Camila Bautista", "Lorenzo Villanueva", "Elena Domingo",
]
PH_BANKS = ["BDO Unibank", "BPI (Bank of the Philippine Islands)", "Metrobank", "UnionBank of the Philippines", "GCash (e-wallet)", "PNB (Philippine National Bank)", "RCBC", "Security Bank"]

async def seed_user_data(user_id: str):
    """Seed 12 recipients + ~20 transfers for a freshly created user."""
    if await db.recipients.count_documents({"user_id": user_id}) > 0:
        return
    recipients = []
    for i, name in enumerate(PH_NAMES):
        rid = str(uuid.uuid4())
        rec = {
            "id": rid, "user_id": user_id, "name": name, "country": "PH",
            "bank": PH_BANKS[i % len(PH_BANKS)],
            "account_number": f"00{random.randint(10,99)} {random.randint(1000,9999)} {random.randint(1000,9999)}",
            "mobile": f"+63 9{random.randint(10,99)} {random.randint(100,999)} {random.randint(1000,9999)}",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=random.randint(10, 200))).isoformat(),
        }
        recipients.append(rec)
    await db.recipients.insert_many([{**r} for r in recipients])
    for r in recipients:
        r.pop("_id", None)

    # Seed 20 transfers (15 completed, 3 pending, 2 failed)
    statuses = ["completed"] * 15 + ["pending"] * 3 + ["failed"] * 2
    random.shuffle(statuses)
    rate = fetch_fx_rate()
    transfers = []
    for i, st in enumerate(statuses):
        rec = random.choice(recipients)
        amt = round(random.uniform(150, 8500), 2)
        q = calc_quote(amt)
        created = datetime.now(timezone.utc) - timedelta(days=random.randint(0, 28), hours=random.randint(0, 23), minutes=random.randint(0, 59))
        stages_done = 5 if st == "completed" else (3 if st == "pending" else 1)
        stages = []
        labels = [
            ("fpx", "FPX payment received", "Your bank transfer completed successfully"),
            ("luno", "MYR converted to USDC on Luno", f"{amt:.2f} MYR → {round(amt/19.4,2)} USDC"),
            ("sui", "USDC settled on Sui blockchain", f"Settlement hash: 0x{uuid.uuid4().hex[:8]}...{uuid.uuid4().hex[:4]}"),
            ("coins", "USDC converted to PHP on Coins.ph", f"Processing → {q['receive_amount_php']:.2f} PHP"),
            ("bank", f"Sent to recipient's {rec['bank']} account", "Awaiting bank confirmation"),
        ]
        for idx, (k, l, d) in enumerate(labels):
            stages.append({
                "key": k, "label": l, "desc": d,
                "done": idx < stages_done,
                "ts": (created + timedelta(seconds=idx*45)).isoformat() if idx < stages_done else None,
            })
        t = {
            "id": str(uuid.uuid4()), "user_id": user_id, "recipient_id": rec["id"],
            "recipient_name": rec["name"], "recipient_bank": rec["bank"],
            "recipient_account": rec["account_number"],
            "send_amount_myr": q["send_amount_myr"], "receive_amount_php": q["receive_amount_php"],
            "rate": q["rate"], "total_fee_myr": q["total_fee"],
            "fx_spread": q["fx_spread"], "platform_fee": q["platform_fee"], "fixed_fee": q["fixed_fee"],
            "reference": gen_reference(), "note": "",
            "status": st,
            "settlement_seconds": random.randint(180, 300),
            "created_at": created.isoformat(),
            "stages": stages,
        }
        transfers.append(t)
    if transfers:
        await db.transfers.insert_many([{**t} for t in transfers])

async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@splash.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Splash@2026")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        uid = str(uuid.uuid4())
        await db.users.insert_one({
            "id": uid, "email": admin_email, "name": "Splash Admin", "company": "Splash Pte Ltd",
            "password_hash": hash_password(admin_password), "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        await seed_user_data(uid)
        logger.info(f"Seeded admin: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

# ---------- Lifecycle ----------
@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.recipients.create_index("user_id")
    await db.transfers.create_index([("user_id", 1), ("created_at", -1)])
    await seed_admin()

@app.on_event("shutdown")
async def shutdown_event():
    client.close()

# ---------- Mount ----------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "*")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
