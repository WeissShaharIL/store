"""Auth and change-password tests."""
from fastapi.testclient import TestClient
from main import app


def test_login_success(client):
    r = client.post("/api/auth/login", json={"customer_id": "admin", "password": "test-admin-pass"})
    assert r.status_code == 200
    body = r.json()
    assert body["customer_id"] == "admin"
    assert body["is_admin"] is True
    # No token in body — it's in the cookie
    assert "token" not in body
    assert r.cookies.get("store_token")


def test_login_wrong_password(client):
    r = client.post("/api/auth/login", json={"customer_id": "admin", "password": "wrong"})
    assert r.status_code == 401


def test_login_unknown_user(client):
    r = client.post("/api/auth/login", json={"customer_id": "ghost", "password": "anything"})
    assert r.status_code == 401


def test_logout(client, auth_headers):
    r = client.post("/api/auth/logout", headers=auth_headers)
    assert r.status_code == 200
    assert r.json() == {"ok": True}


def test_change_password_requires_auth():
    with TestClient(app, raise_server_exceptions=True) as fresh:
        r = fresh.post(
            "/api/auth/change-password",
            json={"current_password": "test-admin-pass", "new_password": "newpass123"},
        )
        assert r.status_code == 401


def test_change_password_wrong_current(client, auth_headers):
    r = client.post(
        "/api/auth/change-password",
        json={"current_password": "totally-wrong", "new_password": "newpass123"},
        headers=auth_headers,
    )
    assert r.status_code == 401


def test_change_password_too_short(client, auth_headers):
    r = client.post(
        "/api/auth/change-password",
        json={"current_password": "test-admin-pass", "new_password": "12345"},
        headers=auth_headers,
    )
    assert r.status_code == 422


def test_change_password_and_login_with_new(client, auth_headers):
    """Change password, verify new credentials work, restore original."""
    NEW = "temp-new-pass-789"

    # Snapshot the pre-change token so we can prove it gets revoked. (auth_headers
    # carries this same token; the live `client` will receive a refreshed cookie
    # from the change endpoint, which would otherwise shadow the stale token.)
    old_token = auth_headers["Authorization"].split(" ", 1)[1]

    # Change to new
    r = client.post(
        "/api/auth/change-password",
        json={"current_password": "test-admin-pass", "new_password": NEW},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text

    # The pre-change token is now revoked via the token_version bump. Use a clean
    # client (no refreshed cookie) carrying only the old bearer token.
    with TestClient(app, raise_server_exceptions=True) as clean:
        revoked = clean.get("/api/me", headers={"Authorization": f"Bearer {old_token}"})
        assert revoked.status_code == 401, "old token should be rejected after password change"

    # Old credentials must fail
    r2 = client.post("/api/auth/login", json={"customer_id": "admin", "password": "test-admin-pass"})
    assert r2.status_code == 401

    # New credentials must work
    r3 = client.post("/api/auth/login", json={"customer_id": "admin", "password": NEW})
    assert r3.status_code == 200
    new_token = r3.cookies.get("store_token")
    new_headers = {"Authorization": f"Bearer {new_token}"}

    # Restore original password so other tests keep working
    r4 = client.post(
        "/api/auth/change-password",
        json={"current_password": NEW, "new_password": "test-admin-pass"},
        headers=new_headers,
    )
    assert r4.status_code == 200
