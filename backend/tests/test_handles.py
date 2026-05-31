"""Admin handles catalog CRUD (/api/admin/handles — admin-only)."""


def test_handles_list_requires_auth(client):
    r = client.get("/api/admin/handles")
    assert r.status_code == 401


def test_handles_list_with_auth(client, auth_headers):
    r = client.get("/api/admin/handles", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_create_list_patch_delete_handle(client, auth_headers):
    # create
    payload = {
        "handle_key": "test-knob",
        "name": "ידית בדיקה",
        "color": "#222222",
        "finish": "matte",
        "door_kind": "both",
        "sort_order": 3,
    }
    r = client.post("/api/admin/handles", json=payload, headers=auth_headers)
    assert r.status_code == 201, r.text
    created = r.json()
    assert created["handle_key"] == "test-knob"
    hid = created["id"]

    # appears in the list
    r = client.get("/api/admin/handles", headers=auth_headers)
    assert any(h["id"] == hid for h in r.json())

    # patch
    r = client.patch(f"/api/admin/handles/{hid}", json={"name": "ידית מעודכנת"}, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["name"] == "ידית מעודכנת"

    # delete (not referenced by any template → allowed)
    r = client.delete(f"/api/admin/handles/{hid}", headers=auth_headers)
    assert r.status_code == 204

    # gone
    r = client.get("/api/admin/handles", headers=auth_headers)
    assert not any(h["id"] == hid for h in r.json())


def test_create_handle_rejects_bad_finish(client, auth_headers):
    payload = {"handle_key": "bad-finish", "name": "x", "color": "#000", "finish": "glossy"}
    r = client.post("/api/admin/handles", json=payload, headers=auth_headers)
    assert r.status_code == 422


def test_create_handle_rejects_bad_door_kind(client, auth_headers):
    payload = {"handle_key": "bad-kind", "name": "x", "color": "#000", "door_kind": "swinging"}
    r = client.post("/api/admin/handles", json=payload, headers=auth_headers)
    assert r.status_code == 422


def test_create_handle_rejects_duplicate_key(client, auth_headers):
    payload = {"handle_key": "dup-key", "name": "x", "color": "#000"}
    r1 = client.post("/api/admin/handles", json=payload, headers=auth_headers)
    assert r1.status_code == 201
    r2 = client.post("/api/admin/handles", json=payload, headers=auth_headers)
    assert r2.status_code == 409
    # cleanup
    client.delete(f"/api/admin/handles/{r1.json()['id']}", headers=auth_headers)


def test_patch_missing_handle_is_404(client, auth_headers):
    r = client.patch("/api/admin/handles/999999", json={"name": "x"}, headers=auth_headers)
    assert r.status_code == 404
