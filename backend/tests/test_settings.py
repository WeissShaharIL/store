"""Settings endpoints (/api/settings) — public GET, admin-only PATCH."""


def test_get_settings_no_auth(client):
    r = client.get("/api/settings")
    assert r.status_code == 200
    assert isinstance(r.json(), dict)


def test_patch_settings_requires_admin(client):
    r = client.patch("/api/settings", json={"values": {"welcome_title": "x"}})
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
