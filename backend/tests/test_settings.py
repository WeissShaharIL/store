"""Settings endpoints (/api/settings) — admin-only GET and PATCH.

The admin settings surface returns *all* keys, so it requires auth; anonymous
callers read the whitelisted subset via /api/public/settings instead.
"""
from fastapi.testclient import TestClient
from main import app


def test_get_settings_requires_admin():
    # Fresh client (no admin cookie from the shared fixture) to test the guard.
    with TestClient(app, raise_server_exceptions=True) as fresh:
        r = fresh.get("/api/settings")
        assert r.status_code == 401


def test_get_settings_admin(client, auth_headers):
    r = client.get("/api/settings", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), dict)


def test_patch_settings_requires_admin():
    # Fresh client (no admin cookie from the shared fixture) to test the guard.
    with TestClient(app, raise_server_exceptions=True) as fresh:
        r = fresh.patch("/api/settings", json={"values": {"welcome_title": "x"}})
        assert r.status_code == 401


def test_patch_settings_persists_values(client, auth_headers):
    r = client.patch(
        "/api/settings",
        json={"values": {"welcome_title": "כותרת בדיקה", "contact_phone": "050-0000000"}},
        headers=auth_headers,
    )
    assert r.status_code == 200
    out = r.json()
    assert out["welcome_title"] == "כותרת בדיקה"
    assert out["contact_phone"] == "050-0000000"

    # read back through the public GET
    r = client.get("/api/settings")
    assert r.json()["welcome_title"] == "כותרת בדיקה"


def test_patch_settings_updates_existing_key(client, auth_headers):
    client.patch("/api/settings", json={"values": {"about_text": "first"}}, headers=auth_headers)
    r = client.patch("/api/settings", json={"values": {"about_text": "second"}}, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["about_text"] == "second"
