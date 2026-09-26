import os
import base64
import hashlib
import secrets
import json
import logging
from pathlib import Path
from urllib.parse import urlencode

import httpx
from fastapi import FastAPI, APIRouter, Request
from fastapi.responses import RedirectResponse, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from cryptography.fernet import Fernet
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("baypay")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

CLIENT_ID = os.environ["WHOP_CLIENT_ID"]
REDIRECT_URI = os.environ["WHOP_REDIRECT_URI"]
APP_ORIGIN = os.environ["APP_ORIGIN"]
fernet = Fernet(os.environ["COOKIE_FERNET_KEY"].encode())

OAUTH = "https://api.whop.com/oauth"
API = "https://api.whop.com/api/v1"
API_VERSION_DATE = "2026-08-03"

# Full grant the Bay Pay wallet Elements need. openid/profile/email identify the
# sign-in; everything else is a signable money action minted onto the Elements token.
SCOPES = [
    "openid", "profile", "email",
    "user:email:read", "user:balance:read",
    "member:basic:read", "member:email:read",
    "payment:basic:read", "plan:basic:read", "access_pass:basic:read",
    "checkout_configuration:create", "checkout_configuration:basic:read",
    "plan:create", "access_pass:create",
    "company:balance:read", "company:authorized_user:read",
    "stats:read",
    "payout:account:read", "payout:account:update",
    "identity:read", "identity:write",
    "payout:withdrawal:read", "payout:destination:read", "payout:transfer:read",
    "payout:withdraw_funds", "payout:create_destination", "payout:update_destination",
    "payout:delete_destination", "payout:transfer_funds", "payout:transfer:export",
    "crypto_wallet:swap",
]
NON_ACTION = {"openid", "profile", "email"}
SIGNABLE_ACTIONS = [s for s in SCOPES if s not in NON_ACTION]

COOKIE_BASE = dict(httponly=True, secure=True, samesite="lax", path="/")

app = FastAPI()
api = APIRouter(prefix="/api")


def enc(v: str) -> str:
    return fernet.encrypt(v.encode()).decode()


def dec(v):
    if not v:
        return None
    try:
        return fernet.decrypt(v.encode()).decode()
    except Exception:
        return None


def b64url(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def challenge_of(verifier: str) -> str:
    return b64url(hashlib.sha256(verifier.encode()).digest())


async def userinfo(access_token: str):
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(f"{OAUTH}/userinfo", headers={"Authorization": f"Bearer {access_token}"})
    if r.is_error:
        return None
    return r.json()


async def refresh_tokens(refresh_token: str):
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(f"{OAUTH}/token", json={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": CLIENT_ID,
        })
    if r.is_error:
        return None
    return r.json()


async def valid_access_token(request: Request):
    """Return (access_token, set_cookie_fn_or_None). Refreshes if needed."""
    token = dec(request.cookies.get("whop_access"))
    if token:
        return token, None
    refresh = dec(request.cookies.get("whop_refresh"))
    if not refresh:
        return None, None
    granted = await refresh_tokens(refresh)
    if not granted:
        return None, None
    new_access = granted["access_token"]
    new_refresh = granted.get("refresh_token", refresh)

    def apply(resp):
        resp.set_cookie("whop_access", enc(new_access), max_age=granted.get("expires_in", 3600), **COOKIE_BASE)
        resp.set_cookie("whop_refresh", enc(new_refresh), max_age=2592000, **COOKIE_BASE)
    return new_access, apply


@api.get("/auth/login")
async def login():
    state = secrets.token_urlsafe(24)
    verifier = secrets.token_urlsafe(64)
    nonce = secrets.token_urlsafe(16)
    params = {
        "response_type": "code",
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "scope": " ".join(SCOPES),
        "state": state,
        "nonce": nonce,
        "code_challenge": challenge_of(verifier),
        "code_challenge_method": "S256",
    }
    resp = RedirectResponse(f"{OAUTH}/authorize?{urlencode(params)}", status_code=302)
    resp.set_cookie("whop_pkce", enc(json.dumps({"state": state, "verifier": verifier})), max_age=600, **COOKIE_BASE)
    return resp


@api.get("/auth/callback")
async def callback(request: Request, code: str = None, state: str = None, error: str = None):
    if error:
        return RedirectResponse(f"{APP_ORIGIN}/?auth_error={error}", status_code=302)
    stored = dec(request.cookies.get("whop_pkce"))
    if not code or not state or not stored:
        return RedirectResponse(f"{APP_ORIGIN}/?auth_error=expired", status_code=302)
    data = json.loads(stored)
    if data.get("state") != state:
        return RedirectResponse(f"{APP_ORIGIN}/?auth_error=state_mismatch", status_code=302)
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(f"{OAUTH}/token", json={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT_URI,
            "client_id": CLIENT_ID,
            "code_verifier": data["verifier"],
        })
    if r.is_error:
        logger.error("token exchange failed: %s", r.text)
        return RedirectResponse(f"{APP_ORIGIN}/?auth_error=token_exchange", status_code=302)
    granted = r.json()
    resp = RedirectResponse(f"{APP_ORIGIN}/app", status_code=302)
    resp.delete_cookie("whop_pkce", path="/")
    resp.set_cookie("whop_access", enc(granted["access_token"]), max_age=granted.get("expires_in", 3600), **COOKIE_BASE)
    if granted.get("refresh_token"):
        resp.set_cookie("whop_refresh", enc(granted["refresh_token"]), max_age=2592000, **COOKIE_BASE)
    return resp


@api.get("/auth/me")
async def me(request: Request):
    token, apply = await valid_access_token(request)
    if not token:
        return JSONResponse({"authenticated": False}, status_code=401)
    info = await userinfo(token)
    if not info:
        return JSONResponse({"authenticated": False}, status_code=401)
    resp = JSONResponse({"authenticated": True, "user": info})
    if apply:
        apply(resp)
    return resp


@api.post("/auth/logout")
async def logout():
    resp = JSONResponse({"ok": True})
    resp.delete_cookie("whop_access", path="/")
    resp.delete_cookie("whop_refresh", path="/")
    return resp


@api.post("/whop/elements-token")
async def elements_token(request: Request):
    token, apply = await valid_access_token(request)
    if not token:
        return JSONResponse({"error": "login required", "signedIn": False}, status_code=401)
    info = await userinfo(token)
    if not info:
        return JSONResponse({"error": "could not read profile", "signedIn": False}, status_code=401)
    account_id = info.get("sub")
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(f"{API}/access_tokens",
                         headers={"Authorization": f"Bearer {token}",
                                  "Content-Type": "application/json",
                                  "Api-Version-Date": API_VERSION_DATE},
                         json={"scoped_actions": SIGNABLE_ACTIONS})
    if r.is_error:
        logger.error("access_tokens mint failed: %s %s", r.status_code, r.text)
        signed_in = r.status_code != 401
        return JSONResponse({"error": "could not mint Elements token", "signedIn": signed_in}, status_code=r.status_code)
    d = r.json()
    resp = JSONResponse({
        "token": d["token"],
        "expiresAt": d["expires_at"],
        "accountId": account_id,
        "canReadPayments": "payment:basic:read" in SIGNABLE_ACTIONS,
    }, headers={"Cache-Control": "no-store"})
    if apply:
        apply(resp)
    return resp


@api.get("/")
async def root():
    return {"service": "baypay", "ok": True}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
