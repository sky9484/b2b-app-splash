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
import io
import requests
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from fastapi.responses import JSONResponse, StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor

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
    is_prod = os.environ.get("ENV", "development") == "production"
    response.set_cookie(
        key="access_token", value=token, httponly=True,
        secure=is_prod, samesite="none" if is_prod else "lax",
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

SUI_EXPLORER_BASE_MOCK = "https://suiscan.xyz/mainnet/tx"  # demo links — only valid when sui_real=true switches to testnet

# Local services (Curlec real flow + Sui Move contract)
from services import curlec_service, sui_service  # noqa: E402

def gen_sui_tx_hash() -> str:
    return "0x" + uuid.uuid4().hex + uuid.uuid4().hex[:16]

def notify_email(to: str, subject: str, body: str) -> dict:
    """Send email via Resend if RESEND_API_KEY set, else console log."""
    api_key = os.environ.get("RESEND_API_KEY")
    sender = os.environ.get("RESEND_FROM", "Splash <onboarding@resend.dev>")
    if not api_key:
        logger.info(f"[EMAIL MOCK] to={to} subject={subject!r}\n{body[:200]}")
        return {"sent": False, "mocked": True}
    try:
        r = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"from": sender, "to": [to], "subject": subject, "html": body},
            timeout=5,
        )
        return {"sent": r.status_code in (200, 202), "mocked": False, "status": r.status_code}
    except Exception as e:
        logger.warning(f"Resend email failed: {e}")
        return {"sent": False, "mocked": False, "error": str(e)}

def notify_sms(to: str, body: str) -> dict:
    """Send SMS via Twilio if creds set, else console log."""
    sid = os.environ.get("TWILIO_ACCOUNT_SID")
    token = os.environ.get("TWILIO_AUTH_TOKEN")
    from_num = os.environ.get("TWILIO_FROM")
    if not (sid and token and from_num and to):
        logger.info(f"[SMS MOCK] to={to} body={body[:120]!r}")
        return {"sent": False, "mocked": True}
    try:
        r = requests.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
            data={"From": from_num, "To": to, "Body": body},
            auth=(sid, token), timeout=5,
        )
        return {"sent": r.status_code in (200, 201), "mocked": False, "status": r.status_code}
    except Exception as e:
        logger.warning(f"Twilio SMS failed: {e}")
        return {"sent": False, "mocked": False, "error": str(e)}

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

def _norm_account(s: str) -> str:
    return "".join((s or "").split())

@api.post("/recipients")
async def create_recipient(body: RecipientIn, user=Depends(get_current_user)):
    norm = _norm_account(body.account_number)
    cursor = db.recipients.find({"user_id": user["id"], "bank": body.bank}, {"_id": 0})
    async for r in cursor:
        if norm and _norm_account(r.get("account_number", "")) == norm:
            raise HTTPException(status_code=409, detail=f"This account already exists for {r['name']}")
    rid = str(uuid.uuid4())
    doc = {
        "id": rid, "user_id": user["id"], "name": body.name, "country": body.country,
        "bank": body.bank, "account_number": body.account_number, "mobile": body.mobile or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.recipients.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/recipients/{rid}")
async def update_recipient(rid: str, body: RecipientIn, user=Depends(get_current_user)):
    existing = await db.recipients.find_one({"id": rid, "user_id": user["id"]}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Recipient not found")
    norm = _norm_account(body.account_number)
    cursor = db.recipients.find({"user_id": user["id"], "bank": body.bank, "id": {"$ne": rid}}, {"_id": 0})
    async for r in cursor:
        if norm and _norm_account(r.get("account_number", "")) == norm:
            raise HTTPException(status_code=409, detail=f"This account already exists for {r['name']}")
    update = {
        "name": body.name, "country": body.country, "bank": body.bank,
        "account_number": body.account_number, "mobile": body.mobile or "",
    }
    await db.recipients.update_one({"id": rid}, {"$set": update})
    return {**existing, **update}

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
    sui_hash = gen_sui_tx_hash()
    sui_explorer = f"{SUI_EXPLORER_BASE_MOCK}/{sui_hash}"  # default mock; replaced below if real
    if sui_service.is_configured():
        # Mark explorer base to testnet up front so UI link is correct even before record
        sui_explorer = sui_service.explorer_url(sui_hash)
    doc = {
        "id": tid, "user_id": user["id"], "recipient_id": rec["id"],
        "recipient_name": rec["name"], "recipient_bank": rec["bank"],
        "recipient_account": rec["account_number"],
        "recipient_mobile": rec.get("mobile", ""),
        "send_amount_myr": q["send_amount_myr"], "receive_amount_php": q["receive_amount_php"],
        "rate": q["rate"], "total_fee_myr": q["total_fee"],
        "fx_spread": q["fx_spread"], "platform_fee": q["platform_fee"], "fixed_fee": q["fixed_fee"],
        "reference": body.reference or gen_reference(),
        "note": body.note or "",
        "status": "pending",
        "settlement_seconds": random.randint(180, 300),
        "created_at": now.isoformat(),
        "sui_tx_hash": sui_hash,
        "sui_explorer_url": sui_explorer,
        "sui_real": False,
        "curlec_order_id": None,
        "curlec_payment_id": None,
        "stages": [
            {"key": "fpx", "label": "FPX payment received", "desc": "Your bank transfer completed successfully", "done": True, "ts": now.isoformat()},
            {"key": "luno", "label": "MYR converted to USDC on Luno", "desc": f"{q['send_amount_myr']:.2f} MYR → {round(q['send_amount_myr']/19.4, 2)} USDC", "done": True, "ts": (now + timedelta(seconds=20)).isoformat()},
            {"key": "sui", "label": "USDC settled on Sui blockchain", "desc": f"Settlement hash: {sui_hash[:10]}…{sui_hash[-6:]}", "done": True, "ts": (now + timedelta(seconds=40)).isoformat()},
            {"key": "coins", "label": "USDC converted to PHP on Coins.ph", "desc": f"Processing → {q['receive_amount_php']:.2f} PHP", "done": False, "ts": None},
            {"key": "bank", "label": f"Sent to recipient's {rec['bank']} account", "desc": "Awaiting bank confirmation", "done": False, "ts": None},
        ],
    }
    await db.transfers.insert_one(doc)
    doc.pop("_id", None)
    # Send "transfer initiated" email to user
    notify_email(
        user["email"],
        f"Splash · Payout {doc['reference']} initiated",
        f"<p>Your payout of <b>RM {q['send_amount_myr']:.2f}</b> to <b>{rec['name']}</b> ({rec['bank']}) is being processed. They'll receive ₱{q['receive_amount_php']:.2f}.</p><p>Reference: <code>{doc['reference']}</code></p>",
    )
    return doc

@api.post("/transfers/{tid}/advance")
async def advance_transfer(tid: str, user=Depends(get_current_user)):
    """Demo helper: marks next pending stage done. Frontend polls this every few seconds."""
    t = await db.transfers.find_one({"id": tid, "user_id": user["id"]}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Transfer not found")
    stages = t["stages"]
    now = datetime.now(timezone.utc).isoformat()
    advanced_key = None
    for s in stages:
        if not s["done"]:
            s["done"] = True
            s["ts"] = now
            advanced_key = s["key"]
            break
    new_status = "completed" if all(s["done"] for s in stages) else "pending"
    update = {"stages": stages, "status": new_status}

    # Real Sui Move call when the "sui" stage fires (if not already real)
    if advanced_key == "sui" and sui_service.is_configured() and not t.get("sui_real"):
        try:
            digest = await sui_service.record_settlement_async(
                ref_id=t["reference"],
                myr_minor=int(round(t["send_amount_myr"] * 100)),
                php_minor=int(round(t["receive_amount_php"] * 100)),
                rate_bp=int(round(t["rate"] * 10000)),
                recipient_hash_bytes=sui_service.recipient_hash(
                    t["recipient_name"], t["recipient_bank"], t["recipient_account"]
                ),
            )
            if digest:
                update["sui_tx_hash"] = digest
                update["sui_explorer_url"] = sui_service.explorer_url(digest)
                update["sui_real"] = True
                # Update the stage description with the real digest
                for s in stages:
                    if s["key"] == "sui":
                        s["desc"] = f"Settlement hash: {digest[:10]}…{digest[-6:]} (testnet)"
                update["stages"] = stages
        except Exception as e:
            logger.warning(f"sui record_settlement raised: {e}")

    await db.transfers.update_one({"id": tid}, {"$set": update})
    t.update(update)
    # Notify on completion
    if new_status == "completed" and t.get("status_notified") != "completed":
        await db.transfers.update_one({"id": tid}, {"$set": {"status_notified": "completed"}})
        notify_email(
            user["email"],
            f"Splash · Payout {t['reference']} delivered",
            f"<p>Your payout to <b>{t['recipient_name']}</b> has been delivered. ₱{t['receive_amount_php']:.2f} is now in their {t['recipient_bank']} account.</p><p>Reference: <code>{t['reference']}</code></p>",
        )
        if t.get("recipient_mobile"):
            notify_sms(
                t["recipient_mobile"],
                f"Splash: ₱{t['receive_amount_php']:.2f} from {user.get('name','')} has been credited to your {t['recipient_bank'].split(' (')[0]} account. Ref {t['reference']}",
            )
    return t

# ---------- Curlec / Razorpay (real FPX) ----------
@api.post("/transfers/{tid}/init-payment")
async def init_payment(tid: str, user=Depends(get_current_user)):
    """Returns either a real Razorpay/Curlec order (when configured) or {mocked: true}."""
    t = await db.transfers.find_one({"id": tid, "user_id": user["id"]}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Transfer not found")
    if not curlec_service.is_configured():
        return {"mocked": True, "reference": t["reference"]}
    order = curlec_service.create_order(
        amount_myr=t["send_amount_myr"],
        receipt=f"splash-{t['reference']}",
        notes={"reference": t["reference"], "transfer_id": tid, "user_email": user["email"]},
    )
    if not order:
        return {"mocked": True, "reference": t["reference"], "error": "razorpay create_order failed"}
    await db.transfers.update_one({"id": tid}, {"$set": {"curlec_order_id": order["id"]}})
    return {
        "mocked": False,
        "key_id": curlec_service.public_key_id(),
        "order_id": order["id"],
        "amount": order["amount"],
        "currency": order["currency"],
        "reference": t["reference"],
        "name": user.get("name", ""),
        "email": user.get("email", ""),
    }


@api.post("/transfers/{tid}/verify-payment")
async def verify_payment(tid: str, body: dict, user=Depends(get_current_user)):
    """Frontend handler callback after Razorpay checkout success."""
    order_id = body.get("razorpay_order_id")
    payment_id = body.get("razorpay_payment_id")
    signature = body.get("razorpay_signature")
    if not (order_id and payment_id and signature):
        raise HTTPException(status_code=400, detail="Missing razorpay fields")
    if not curlec_service.verify_payment_signature(order_id, payment_id, signature):
        raise HTTPException(status_code=400, detail="Invalid Razorpay signature")
    await db.transfers.update_one(
        {"id": tid, "user_id": user["id"]},
        {"$set": {"curlec_payment_id": payment_id}},
    )
    return {"ok": True}


@app.post("/api/webhooks/curlec")
async def curlec_webhook(request: Request):
    """Curlec/Razorpay webhook. Verifies HMAC signature and progresses stages."""
    raw = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    if not curlec_service.verify_webhook_signature(raw, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")
    payload = await request.json()
    event = payload.get("event", "")
    payment = payload.get("payload", {}).get("payment", {}).get("entity", {})
    notes = payment.get("notes") or {}
    tid = notes.get("transfer_id")
    if not tid:
        return {"ok": True, "ignored": True}
    if event == "payment.captured":
        await db.transfers.update_one(
            {"id": tid},
            {"$set": {"curlec_payment_id": payment.get("id")}},
        )
        # Auto-advance: the "fpx" stage is already done at create time; no-op for now.
        # The standard advance loop continues client-side.
        logger.info(f"[CURLEC] payment.captured for transfer {tid}")
    elif event == "payment.failed":
        await db.transfers.update_one(
            {"id": tid},
            {"$set": {"status": "failed", "curlec_payment_id": payment.get("id")}},
        )
        logger.info(f"[CURLEC] payment.failed for transfer {tid}")
    return {"ok": True}

@api.get("/transfers/{tid}/receipt")
async def transfer_receipt(tid: str, user=Depends(get_current_user)):
    t = await db.transfers.find_one({"id": tid, "user_id": user["id"]}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Transfer not found")
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    W, H = A4
    navy = HexColor("#0A1E3F"); cyan = HexColor("#22A7F0"); green = HexColor("#00D2A0")
    muted = HexColor("#718096"); border = HexColor("#E2E8F0"); text = HexColor("#1A202C")

    # Header band
    c.setFillColor(navy); c.rect(0, H - 32*mm, W, 32*mm, fill=1, stroke=0)
    c.setFillColor(cyan); c.roundRect(20*mm, H - 24*mm, 14*mm, 14*mm, 3*mm, fill=1, stroke=0)
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 18); c.drawString(40*mm, H - 18*mm, "Splash")
    c.setFont("Helvetica", 9); c.drawString(40*mm, H - 23*mm, "Cross-border payout receipt")
    c.setFont("Helvetica", 9); c.drawRightString(W - 20*mm, H - 18*mm, f"Ref: {t['reference']}")
    c.drawRightString(W - 20*mm, H - 23*mm, datetime.fromisoformat(t['created_at']).strftime("%d %b %Y, %H:%M UTC"))

    # Status pill
    y = H - 45*mm
    status = t['status']
    pill_color = {"completed": green, "pending": HexColor("#FFB800"), "failed": HexColor("#E53E3E")}.get(status, muted)
    c.setFillColor(pill_color); c.roundRect(20*mm, y, 28*mm, 7*mm, 3.5*mm, fill=1, stroke=0)
    c.setFillColor(HexColor("#FFFFFF")); c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(34*mm, y + 2.4*mm, status.upper())

    # Hero amounts
    y -= 18*mm
    c.setFillColor(muted); c.setFont("Helvetica", 9); c.drawString(20*mm, y, "YOU SENT")
    c.setFillColor(text); c.setFont("Helvetica-Bold", 22)
    c.drawString(20*mm, y - 8*mm, f"RM {t['send_amount_myr']:,.2f}")
    c.setFillColor(muted); c.setFont("Helvetica", 9); c.drawString(W/2, y, "RECIPIENT RECEIVED")
    c.setFillColor(green); c.setFont("Helvetica-Bold", 22)
    c.drawString(W/2, y - 8*mm, f"PHP {t['receive_amount_php']:,.2f}")

    # Details rows
    y -= 24*mm
    c.setStrokeColor(border); c.setLineWidth(0.5)
    rows = [
        ("Recipient", t['recipient_name']),
        ("Bank", t['recipient_bank']),
        ("Account number", t['recipient_account']),
        ("Exchange rate", f"1 MYR = {t['rate']:.4f} PHP"),
        ("FX spread (1.20%)", f"RM {t['fx_spread']:.2f}"),
        ("Platform fee (0.20%)", f"RM {t['platform_fee']:.2f}"),
        ("Fixed fee", f"RM {t['fixed_fee']:.2f}"),
        ("Total fee", f"RM {t['total_fee_myr']:.2f}"),
        ("Total debit", f"RM {t['send_amount_myr']:,.2f}"),
        ("Sui transaction hash", t.get('sui_tx_hash', '')[:24] + "…"),
        ("Note", t.get('note') or "—"),
    ]
    for label, val in rows:
        c.line(20*mm, y - 1*mm, W - 20*mm, y - 1*mm)
        c.setFillColor(muted); c.setFont("Helvetica", 9); c.drawString(20*mm, y - 6*mm, label)
        c.setFillColor(text); c.setFont("Helvetica", 10); c.drawRightString(W - 20*mm, y - 6*mm, str(val))
        y -= 9*mm

    # Footer
    c.setFillColor(muted); c.setFont("Helvetica", 8)
    c.drawString(20*mm, 20*mm, "Splash Pte Ltd · Regulated by Bank Negara Malaysia · BSP-licensed PH partner")
    c.drawString(20*mm, 16*mm, f"Verify on Sui Explorer: {t.get('sui_explorer_url', '')}")
    c.showPage(); c.save()
    buf.seek(0)
    return StreamingResponse(
        buf, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="splash-receipt-{t["reference"]}.pdf"'}
    )

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
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        os.environ.get("FRONTEND_URL", "http://localhost:3000"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
