# Bay Pay — Custom neobank on Emergent (Whop-powered)

## Problem statement
User owns the Whop app "Bay Pay" (app_Ajy3GAR61PgCa2), a crypto neobank hosted at baypay.whop.site.
They want a **custom website they control** (own domain baypay.cards, Porkbun) that reuses the Bay Pay
design and embeds Whop's wallet for the actual neobank features. Whop's own custom-domain feature is
gated ("available soon"), so instead we rebuilt a standalone site on Emergent that embeds Whop Elements
(officially supported for external websites) using Whop OAuth + server-minted scoped access tokens.

## Architecture
- Frontend: React (CRA/craco), react-router-dom. Dark Bay Pay design copied verbatim from the pulled
  Whop repo (styles.css + brand images). Whop wallet Elements embedded via @whop/elements@1.0.0 +
  @whop/elements-react@1.0.0 (handle API: WhopElements -> useWhop().wallet.create(...) -> mount).
- Backend: FastAPI. Whop OAuth 2.0 PKCE (public client). Encrypted httpOnly cookies (Fernet).
  Endpoints: /api/auth/login, /api/auth/callback, /api/auth/me, /api/auth/logout,
  /api/whop/elements-token (mints scoped access token via POST api.whop.com/api/v1/access_tokens
  using the user's OAuth bearer, full money-scope set).
- Env (backend/.env): WHOP_CLIENT_ID, WHOP_REDIRECT_URI, WHOP_API_KEY, COOKIE_FERNET_KEY, APP_ORIGIN.

## Implemented (2026-06)
- Dark landing page (hero, coin marquee, features, steps, metrics, card showcase, tiers, FAQ) — VERIFIED rendering.
- Whop OAuth login redirect — VERIFIED (302 to api.whop.com/oauth/authorize with PKCE + full scopes).
- /app auth gate ("Continue with Whop") — VERIFIED rendering; /api/auth/me returns 401 when signed out.
- App shell + sidebar (Home/Cards/Send/Deposit/Withdraw) embedding wallet Elements:
  balances, activity, actions (incl. Convert/swap), cards chart+table+details overlay, deposit,
  withdraw, send. CODE COMPLETE — NOT yet verified live (needs a real Whop sign-in).

## NOT verified / open risk
- The authenticated wallet Elements have NOT been confirmed rendering on this external domain because
  it requires an interactive Whop account login (only the user can perform it). This is the make-or-break
  check for whether Whop Elements authenticate off baypay.whop.site.

## Backlog / next
- P0: User logs in at /app and confirms wallet Elements load; fix any CSP/origin issues Whop surfaces.
- P1: Deploy to Emergent, attach custom domain baypay.cards, add its /api/auth/callback to Whop redirect_uris.
- P2: Cards create flow + identity verification screen; reports/invoicing screens; entity/company switcher.
