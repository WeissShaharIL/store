"""Bug tracker (/api/admin/bugs) — CRUD + image/video attachments."""
import io

from fastapi.testclient import TestClient

from main import app
from .conftest import make_jpeg


def _create(client, auth_headers, title="כפתור שבור", description="צעדים לשחזור"):
    r = client.post(
        "/api/admin/bugs",
        json={"title": title, "description": description},
        headers=auth_headers,
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_requires_admin():
    with TestClient(app, raise_server_exceptions=True) as fresh:
        assert fresh.get("/api/admin/bugs").status_code == 401
        assert fresh.post("/api/admin/bugs", json={"title": "x"}).status_code == 401


def test_create_and_list(client, auth_headers):
    bug = _create(client, auth_headers)
    assert bug["status"] == "open"
    assert bug["attachments"] == []
    r = client.get("/api/admin/bugs", headers=auth_headers)
    assert r.status_code == 200
    assert any(b["id"] == bug["id"] for b in r.json())


def test_update_status_and_text(client, auth_headers):
    bug = _create(client, auth_headers)
    r = client.patch(
        f"/api/admin/bugs/{bug['id']}",
        json={"status": "closed", "description": "תוקן"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json()["status"] == "closed"
    assert r.json()["description"] == "תוקן"

    r = client.patch(
        f"/api/admin/bugs/{bug['id']}", json={"status": "bogus"}, headers=auth_headers
    )
    assert r.status_code == 422


def test_image_attachment_roundtrip(client, auth_headers):
    bug = _create(client, auth_headers)
    r = client.post(
        f"/api/admin/bugs/{bug['id']}/attachments",
        files={"file": ("shot.jpg", io.BytesIO(make_jpeg()), "image/jpeg")},
        headers=auth_headers,
    )
    assert r.status_code == 201, r.text
    atts = r.json()["attachments"]
    assert len(atts) == 1 and atts[0]["kind"] == "image"
    assert atts[0]["original_name"] == "shot.jpg"

    # delete the attachment
    r = client.delete(
        f"/api/admin/bugs/{bug['id']}/attachments/0", headers=auth_headers
    )
    assert r.status_code == 200
    assert r.json()["attachments"] == []


def test_video_attachment(client, auth_headers):
    bug = _create(client, auth_headers)
    r = client.post(
        f"/api/admin/bugs/{bug['id']}/attachments",
        files={"file": ("repro.mp4", io.BytesIO(b"\x00\x00\x00 ftypisom-fake"), "video/mp4")},
        headers=auth_headers,
    )
    assert r.status_code == 201, r.text
    assert r.json()["attachments"][0]["kind"] == "video"


def test_unsupported_attachment_type(client, auth_headers):
    bug = _create(client, auth_headers)
    r = client.post(
        f"/api/admin/bugs/{bug['id']}/attachments",
        files={"file": ("notes.txt", io.BytesIO(b"hello"), "text/plain")},
        headers=auth_headers,
    )
    assert r.status_code == 422


def test_delete_bug(client, auth_headers):
    bug = _create(client, auth_headers)
    assert client.delete(f"/api/admin/bugs/{bug['id']}", headers=auth_headers).status_code == 204
    r = client.get("/api/admin/bugs", headers=auth_headers)
    assert all(b["id"] != bug["id"] for b in r.json())
