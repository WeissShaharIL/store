"""
Closet template CRUD tests — covers the core admin workflow for managing
closet configurations, including the MediaFile registration hook.
"""
import io
from tests.conftest import make_jpeg

SAMPLE_CONFIG = '{"doors": [{"kind": "sliding", "id": "d1"}], "dimensions": {"H": 240, "W": 80, "D": 56, "T": 2, "compartmentWidth": 80}}'


def _create_template(client, auth_headers, name="Test Closet"):
    r = client.post(
        "/api/admin/closet-templates",
        json={"name": name, "config_json": SAMPLE_CONFIG},
        headers=auth_headers,
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_list_templates(client, auth_headers):
    r = client.get("/api/admin/closet-templates", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_create_template(client, auth_headers):
    t = _create_template(client, auth_headers, "Sliding 2-door")
    assert t["name"] == "Sliding 2-door"
    assert isinstance(t["id"], int)
    assert t["image_path"] is None
    # cleanup
    client.delete(f"/api/admin/closet-templates/{t['id']}", headers=auth_headers)


def test_create_template_requires_auth(client):
    from fastapi.testclient import TestClient
    from main import app
    with TestClient(app, raise_server_exceptions=True) as fresh:
        r = fresh.post("/api/admin/closet-templates", json={"name": "x", "config_json": "{}"})
        assert r.status_code == 401


def test_update_template(client, auth_headers):
    t = _create_template(client, auth_headers, "Old Name")
    r = client.patch(
        f"/api/admin/closet-templates/{t['id']}",
        json={"name": "New Name"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json()["name"] == "New Name"
    client.delete(f"/api/admin/closet-templates/{t['id']}", headers=auth_headers)


def test_upload_template_image_registers_in_media(client, auth_headers):
    """
    Uploading a closet image must also create a MediaFile record (the library hook).
    """
    t = _create_template(client, auth_headers, "Image Test Closet")
    tid = t["id"]

    # Before upload — get current media file count
    before = client.get("/api/admin/media/files", headers=auth_headers).json()
    before_count = len(before)

    data = make_jpeg()
    r = client.post(
        f"/api/admin/closet-templates/{tid}/image",
        files={"file": ("closet.jpg", io.BytesIO(data), "image/jpeg")},
        headers=auth_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["image_path"] is not None
    assert body["image_path"].endswith(".jpg")

    # MediaFile should have been created for this image
    after = client.get("/api/admin/media/files", headers=auth_headers).json()
    assert len(after) == before_count + 1
    paths = [f["image_path"] for f in after]
    assert body["image_path"] in paths

    client.delete(f"/api/admin/closet-templates/{tid}", headers=auth_headers)


def test_upload_template_image_invalid_file(client, auth_headers):
    t = _create_template(client, auth_headers)
    r = client.post(
        f"/api/admin/closet-templates/{t['id']}/image",
        files={"file": ("bad.txt", io.BytesIO(b"not image"), "text/plain")},
        headers=auth_headers,
    )
    assert r.status_code == 422
    client.delete(f"/api/admin/closet-templates/{t['id']}", headers=auth_headers)


def test_delete_template(client, auth_headers):
    t = _create_template(client, auth_headers, "To Delete")
    r = client.delete(f"/api/admin/closet-templates/{t['id']}", headers=auth_headers)
    assert r.status_code in (200, 204)

    # Should not appear in list
    templates = client.get("/api/admin/closet-templates", headers=auth_headers).json()
    assert not any(t2["id"] == t["id"] for t2 in templates)


def test_public_closets_only_shows_ready(client, auth_headers):
    """
    Templates must be marked is_ready=True to appear in the public listing.
    A freshly created template should NOT appear publicly.
    """
    t = _create_template(client, auth_headers, "Not Ready Yet")

    public = client.get("/api/public/closets").json()
    assert not any(p["id"] == t["id"] for p in public)

    client.delete(f"/api/admin/closet-templates/{t['id']}", headers=auth_headers)
