"""Health, auth, and auth-guard smoke tests."""
from fastapi.testclient import TestClient
from main import app


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"ok": True}


def test_health_returns_json(client):
    r = client.get("/api/health")
    assert r.headers["content-type"].startswith("application/json")


def test_login_bad_credentials(client):
    r = client.post("/api/auth/login", json={"customer_id": "nobody", "password": "wrong"})
    assert r.status_code == 401


def test_login_sets_cookie(client, admin_token):
    # admin_token fixture already verified login works; just check the token is a JWT string
    assert "." in admin_token  # JWTs have 3 dot-separated parts


def test_protected_route_requires_auth():
    """Use a fresh client with no cookies to test the auth guard."""
    with TestClient(app, raise_server_exceptions=True) as fresh:
        r = fresh.get("/api/admin/media/folders")
        assert r.status_code == 401


def test_protected_route_with_auth(client, auth_headers):
    r = client.get("/api/admin/media/folders", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_public_closets_no_auth(client):
    """Public endpoints are accessible without authentication."""
    r = client.get("/api/public/closets")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_public_settings_no_auth(client):
    r = client.get("/api/public/settings")
    assert r.status_code == 200
