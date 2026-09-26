"""Bay Pay backend API tests - unauthenticated gating & login redirect."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://whop-deploy-helper.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Auth gating ---
class TestAuthGating:
    def test_entities_get_unauth_401(self, client):
        r = client.get(f"{API}/entities")
        assert r.status_code == 401
        assert r.json().get("signedIn") is False

    def test_entities_post_unauth_401(self, client):
        r = client.post(f"{API}/entities", json={})
        assert r.status_code == 401
        assert r.json().get("signedIn") is False

    def test_cards_get_biz_unauth_401(self, client):
        r = client.get(f"{API}/cards", params={"accountId": "biz_test"})
        assert r.status_code == 401
        assert r.json().get("signedIn") is False

    def test_cards_get_nonbiz_unauth_returns_400_before_auth(self, client):
        # Code path: accountId check runs BEFORE auth check for GET /cards.
        r = client.get(f"{API}/cards", params={"accountId": "user_x"})
        # Report either 400 (validation-first) or 401 (auth-first). Assert one of them.
        assert r.status_code in (400, 401)
        print(f"[info] GET /cards non-biz unauth -> {r.status_code}")

    def test_cards_post_nonbiz_unauth(self, client):
        r = client.post(f"{API}/cards", json={"accountId": "not_biz"})
        # Same pattern - accountId validated before auth in POST /cards
        assert r.status_code in (400, 401)
        print(f"[info] POST /cards non-biz unauth -> {r.status_code}")

    def test_cards_post_biz_unauth_401(self, client):
        r = client.post(f"{API}/cards", json={"accountId": "biz_test"})
        assert r.status_code == 401

    def test_cards_create_unauth(self, client):
        # Body missing name -> may 400 before auth; test with valid body too
        r = client.post(f"{API}/cards/create", json={"accountId": "biz_test", "name": "MyCard"})
        assert r.status_code == 401

    def test_cards_create_unauth_bad_body(self, client):
        r = client.post(f"{API}/cards/create", json={"accountId": "not_biz", "name": "x"})
        assert r.status_code in (400, 401)

    def test_auth_me_unauth_401(self, client):
        r = client.get(f"{API}/auth/me")
        assert r.status_code == 401
        assert r.json() == {"authenticated": False}

    def test_elements_token_unauth_401(self, client):
        r = client.post(f"{API}/whop/elements-token")
        assert r.status_code == 401


# --- Login redirect ---
class TestLoginRedirect:
    def test_login_302_to_whop_authorize(self, client):
        r = client.get(f"{API}/auth/login", allow_redirects=False)
        assert r.status_code == 302
        loc = r.headers.get("location", "")
        assert loc.startswith("https://api.whop.com/oauth/authorize"), loc
        assert "client_id=" in loc
        assert "code_challenge=" in loc
        assert "scope=" in loc
        assert "code_challenge_method=S256" in loc
        # cookie for pkce should be set
        assert "whop_pkce" in r.headers.get("set-cookie", "")


class TestHealth:
    def test_api_root(self, client):
        r = client.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("ok") is True
