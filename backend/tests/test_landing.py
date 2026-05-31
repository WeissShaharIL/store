"""Admin landing settings (/api/admin/landing — admin-only)."""
from fastapi.testclient import TestClient
from main import app

LANDING_KEYS = {
    "welcome_title", "welcome_subtitle", "contact_phone", "contact_whatsapp",
    "hero_tagline", "about_text", "trust_items",
}


def test_landing_get_requires_admin():
    # Fresh client (no admin cookie from the shared fixture) to test the guard.
    with TestClient(app, raise_server_exceptions=True) as fresh:
        r = fresh.get("/api/admin/landing")
        assert r.status_code == 401


def test_landing_get_with_auth_returns_dict(client, auth_headers):
    r = client.get("/api/admin/landing", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), dict)


def test_landing_patch_persists_whitelisted_keys(client, auth_headers):
    r = client.patch(
        "/api/admin/landing",
        json={"hero_tagline": "עיצוב ומסירה", "about_text": "על אודות"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    out = r.json()
    assert out["hero_tagline"] == "עיצוב ומסירה"
    assert out["about_text"] == "על אודות"


def test_landing_patch_ignores_non_whitelisted_keys(client, auth_headers):
    r = client.patch(
        "/api/admin/landing",
        json={"hero_tagline": "ok", "secret_admin_flag": "should-be-ignored"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert "secret_admin_flag" not in r.json()


def test_landing_get_only_exposes_landing_keys(client, auth_headers):
    r = client.get("/api/admin/landing", headers=auth_headers)
    assert set(r.json().keys()) <= LANDING_KEYS
