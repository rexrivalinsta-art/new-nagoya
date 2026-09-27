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


def origin_of(request: Request) -> str:
    """Public origin of the incoming request (works behind the ingress/proxy).
    Falls back to APP_ORIGIN env so nothing breaks if headers are absent."""
    host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    proto = (request.headers.get("x-forwarded-proto") or "https").split(",")[0].strip()
    if host:
        host = host.split(",")[0].strip()
        if host and "localhost" not in host and "127.0.0.1" not in host:
            return f"{proto}://{host}"
    return APP_ORIGIN


def redirect_uri_of(request: Request) -> str:
    return f"{origin_of(request)}/api/auth/callback"


@api.get("/auth/login")
async def login(request: Request):
    state = secrets.token_urlsafe(24)
    verifier = secrets.token_urlsafe(64)
    nonce = secrets.token_urlsafe(16)
    params = {
        "response_type": "code",
        "client_id": CLIENT_ID,
        "redirect_uri": redirect_uri_of(request),
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
    app_origin = origin_of(request)
    if error:
        return RedirectResponse(f"{app_origin}/?auth_error={error}", status_code=302)
    stored = dec(request.cookies.get("whop_pkce"))
    if not code or not state or not stored:
        return RedirectResponse(f"{app_origin}/?auth_error=expired", status_code=302)
    data = json.loads(stored)
    if data.get("state") != state:
        return RedirectResponse(f"{app_origin}/?auth_error=state_mismatch", status_code=302)
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(f"{OAUTH}/token", json={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri_of(request),
            "client_id": CLIENT_ID,
            "code_verifier": data["verifier"],
        })
    if r.is_error:
        logger.error("token exchange failed: %s", r.text)
        return RedirectResponse(f"{app_origin}/?auth_error=token_exchange", status_code=302)
    granted = r.json()
    resp = RedirectResponse(f"{app_origin}/app", status_code=302)
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


CARD_API_VERSION_DATE = "2026-08-25-2"


def api_headers(token):
    return {"Accept": "application/json", "Content-Type": "application/json",
            "Api-Version-Date": API_VERSION_DATE, "Authorization": f"Bearer {token}"}


def parent_headers():
    return {"Accept": "application/json", "Content-Type": "application/json",
            "Api-Version-Date": API_VERSION_DATE, "Authorization": f"Bearer {os.environ['WHOP_API_KEY']}"}


async def _list_accounts(client, headers):
    rows, after = [], None
    for _ in range(6):
        params = {"first": 50}
        if after:
            params["after"] = after
        r = await client.get(f"{API}/accounts", headers=headers, params=params)
        if r.is_error:
            return None
        b = r.json()
        rows += b.get("data", [])
        pi = b.get("page_info") or {}
        if not pi.get("has_next_page") or not pi.get("end_cursor"):
            return rows
        after = pi["end_cursor"]
    return rows


async def _live_company_ids(client, parent_id):
    ids, after = set(), None
    for _ in range(6):
        params = {"first": 50, "parent_company_id": parent_id}
        if after:
            params["after"] = after
        r = await client.get(f"{API}/companies", headers=parent_headers(), params=params)
        if r.is_error:
            return None
        b = r.json()
        for c in b.get("data", []):
            if c.get("id"):
                ids.add(c["id"])
        pi = b.get("page_info") or {}
        if not pi.get("has_next_page") or not pi.get("end_cursor"):
            return ids
        after = pi["end_cursor"]
    return ids


async def _neobank_parent(client):
    r = await client.get(f"{API}/accounts/me", headers=parent_headers())
    if r.is_error:
        return None
    b = r.json()
    return {"id": b.get("id"), "title": b.get("title"), "logo_url": b.get("logo_url")} if b.get("id") else None


@api.get("/entities")
async def entities(request: Request):
    token, apply = await valid_access_token(request)
    if not token:
        return JSONResponse({"error": "login required", "signedIn": False}, status_code=401)
    async with httpx.AsyncClient(timeout=20) as client:
        parent = await _neobank_parent(client)
        if not parent:
            return JSONResponse({"entities": [], "error": "Could not load your entities."})
        # operator = can read parent balance with the user's own token
        pr = await client.get(f"{API}/accounts/{parent['id']}", headers=api_headers(token))
        operator = (not pr.is_error) and (pr.json().get("total_usd") is not None)
        accounts = await _list_accounts(client, parent_headers() if operator else api_headers(token))
        live = await _live_company_ids(client, parent["id"])
        viewer = await client.get(f"{API}/users/me", headers=api_headers(token))
    vjson = {} if viewer.is_error else viewer.json()
    if accounts is None or live is None:
        return JSONResponse({"entities": [], "error": "Could not load your entities."})
    ents = [{"id": a["id"], "name": a.get("title") or a["id"], "imageUrl": a.get("logo_url"), "kind": "entity"}
            for a in accounts if (a.get("parent_account") or {}).get("id") == parent["id"] and a["id"] in live]
    if operator:
        ents = [{"id": parent["id"], "name": parent.get("title") or "Overview", "imageUrl": parent.get("logo_url"), "kind": "overview"}] + ents
    resp = JSONResponse({"entities": ents,
                         "viewerName": (vjson.get("name") or vjson.get("username") or None)})
    if apply:
        apply(resp)
    return resp


@api.post("/entities")
async def create_entity(request: Request):
    token, apply = await valid_access_token(request)
    if not token:
        return JSONResponse({"error": "login required", "signedIn": False}, status_code=401)
    async with httpx.AsyncClient(timeout=20) as client:
        parent = await _neobank_parent(client)
        if not parent:
            return JSONResponse({"error": "Could not identify this neobank."}, status_code=502)
        vr = await client.get(f"{API}/users/me", headers=api_headers(token))
        viewer = {} if vr.is_error else vr.json()
        email = viewer.get("email")
        if not email:
            who = await client.get(f"{OAUTH}/userinfo", headers={"Authorization": f"Bearer {token}"})
            if not who.is_error:
                email = who.json().get("email")
        if not email:
            return JSONResponse({"error": "This app needs permission to read your email.", "needsReauth": True}, status_code=403)
        name = (viewer.get("username") or viewer.get("name") or "").strip()
        digest = hashlib.sha256(f"{parent['id']}:{email.strip().lower()}".encode()).hexdigest()
        created = await client.post(f"{API}/accounts", headers=parent_headers(), json={
            "email": email,
            "metadata": {"external_id": f"nb_{digest}"},
            "title": (f"{name}'s account" if name else "Personal account"),
        })
    if created.is_error:
        b = created.json() if created.headers.get("content-type", "").startswith("application/json") else {}
        msg = (b.get("error") or {}).get("message") or b.get("message") or f"Could not create the entity ({created.status_code})."
        return JSONResponse({"error": msg}, status_code=created.status_code)
    a = created.json()
    resp = JSONResponse({"entity": {"id": a["id"], "name": a.get("title"), "imageUrl": None, "kind": "entity"}}, status_code=201)
    if apply:
        apply(resp)
    return resp


@api.get("/cards")
async def cards_state(request: Request, accountId: str = ""):
    token, apply = await valid_access_token(request)
    if not token:
        return JSONResponse({"error": "login required", "signedIn": False}, status_code=401)
    if not accountId.startswith("biz_"):
        return JSONResponse({"error": "accountId must be a biz_ id."}, status_code=400)
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(f"{API}/accounts/{accountId}", headers=api_headers(token))
    if r.is_error:
        return JSONResponse({"error": "Could not read your card application."}, status_code=r.status_code)
    acc = r.json()
    caps = acc.get("capabilities") or {}
    cards = acc.get("cards") or {}
    status = cards.get("status")
    ver = acc.get("verification") or {}
    biz = (ver.get("business") or {}).get("status")
    ind = (ver.get("individual") or {}).get("status")
    id_approved = ((biz if biz and biz != "not_started" else ind) == "approved")
    if not caps.get("card_issuing"):
        scene = "unavailable"
    elif not cards or not status:
        scene = "intro"
    elif status == "approved":
        scene = "approved"
    elif status == "needs_information":
        scene = "needs_resubmit"
    elif status == "needs_verification":
        scene = "needs_identity"
    elif status in ("denied", "locked", "canceled"):
        scene = "declined"
    else:
        scene = "review"
    resp = JSONResponse({"scene": scene, "status": status, "kind": cards.get("kind"),
                         "identityApproved": id_approved,
                         "appliesAsBusiness": biz == "approved", "outstanding": 0})
    if apply:
        apply(resp)
    return resp


@api.post("/cards")
async def cards_apply(request: Request):
    token, apply = await valid_access_token(request)
    if not token:
        return JSONResponse({"error": "login required", "signedIn": False}, status_code=401)
    body = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}
    account_id = (body or {}).get("accountId", "")
    if not account_id.startswith("biz_"):
        return JSONResponse({"error": "accountId must be a biz_ id."}, status_code=400)
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(f"{API}/cards", headers=api_headers(token), json={"account_id": account_id})
    if r.is_error:
        b = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
        msg = (b.get("error") or {}).get("message") or b.get("message") or f"Could not apply ({r.status_code})."
        t = "identity_required" if "identity" in msg.lower() else "upstream_error"
        return JSONResponse({"error": {"message": msg, "type": t}}, status_code=r.status_code)
    d = r.json()
    resp = JSONResponse({"object": d.get("object"), "status": d.get("status")})
    if apply:
        apply(resp)
    return resp


@api.post("/cards/create")
async def cards_create(request: Request):
    token, apply = await valid_access_token(request)
    if not token:
        return JSONResponse({"error": {"message": "login required"}, "signedIn": False}, status_code=401)
    body = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}
    body = body or {}
    account_id = body.get("accountId", "")
    name = (body.get("name") or "").strip()
    if not account_id.startswith("biz_"):
        return JSONResponse({"error": {"message": "accountId must be a biz_ id."}}, status_code=400)
    if not name or len(name) > 30:
        return JSONResponse({"error": {"message": "Card name must be 1-30 characters."}}, status_code=400)
    payload = {"account_id": account_id, "name": name}
    if isinstance(body.get("spendLimit"), (int, float)) and body["spendLimit"] > 0:
        payload["spend_limit"] = body["spendLimit"]
        payload["spend_limit_frequency"] = body.get("spendLimitFrequency", "monthly")
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(f"{API}/cards", headers={**api_headers(token), "Api-Version-Date": CARD_API_VERSION_DATE}, json=payload)
    d = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
    if r.is_error:
        msg = (d.get("error") or {}).get("message") or d.get("message") or f"Could not create card ({r.status_code})."
        return JSONResponse({"error": {"message": msg}}, status_code=r.status_code)
    resp = JSONResponse(d, status_code=r.status_code)
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
