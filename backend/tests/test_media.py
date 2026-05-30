"""
Media library CRUD tests.

Each test is fully isolated via the tmp_folder / tmp_file fixtures in conftest.
No test depends on another having run first.
"""
import io
from fastapi.testclient import TestClient
from main import app
from tests.conftest import make_jpeg


# ── Folders ───────────────────────────────────────────────────────────────────

def test_list_folders_returns_list(client, auth_headers):
    r = client.get("/api/admin/media/folders", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_create_folder(client, auth_headers):
    r = client.post("/api/admin/media/folders", data={"name": "ארונות הזזה"}, headers=auth_headers)
    assert r.status_code == 201
    body = r.json()
    assert body["name"] == "ארונות הזזה"
    assert body["file_count"] == 0
    assert isinstance(body["id"], int)
    # cleanup
    client.delete(f"/api/admin/media/folders/{body['id']}", headers=auth_headers)


def test_create_folder_empty_name_rejected(client, auth_headers):
    r = client.post("/api/admin/media/folders", data={"name": "   "}, headers=auth_headers)
    assert r.status_code == 422


def test_created_folder_appears_in_list(client, auth_headers, tmp_folder):
    r = client.get("/api/admin/media/folders", headers=auth_headers)
    ids = [f["id"] for f in r.json()]
    assert tmp_folder["id"] in ids


def test_delete_folder(client, auth_headers):
    # Create a dedicated folder so we can delete it cleanly
    r = client.post("/api/admin/media/folders", data={"name": "to-delete"}, headers=auth_headers)
    fid = r.json()["id"]
    r2 = client.delete(f"/api/admin/media/folders/{fid}", headers=auth_headers)
    assert r2.status_code == 204
    # Verify gone
    ids = [f["id"] for f in client.get("/api/admin/media/folders", headers=auth_headers).json()]
    assert fid not in ids


def test_delete_nonexistent_folder(client, auth_headers):
    r = client.delete("/api/admin/media/folders/99999", headers=auth_headers)
    assert r.status_code == 404


def test_delete_folder_moves_files_to_unassigned(client, auth_headers, tmp_file, tmp_folder):
    """When a folder is deleted its files should become unassigned (folder_id = null)."""
    file_id = tmp_file["id"]
    folder_id = tmp_folder["id"]

    # Confirm file is in the folder
    in_folder = client.get(f"/api/admin/media/files?folder_id={folder_id}", headers=auth_headers).json()
    assert any(f["id"] == file_id for f in in_folder)

    # Delete folder — tmp_folder fixture will try to delete it too but 404 is fine
    client.delete(f"/api/admin/media/folders/{folder_id}", headers=auth_headers)

    # File should now have folder_id = null
    unassigned = client.get("/api/admin/media/files?no_folder=true", headers=auth_headers).json()
    match = next((f for f in unassigned if f["id"] == file_id), None)
    assert match is not None
    assert match["folder_id"] is None

    # cleanup file
    client.delete(f"/api/admin/media/files/{file_id}", headers=auth_headers)


# ── Files ─────────────────────────────────────────────────────────────────────

def test_list_files_returns_list(client, auth_headers):
    r = client.get("/api/admin/media/files", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_upload_file_to_folder(client, auth_headers, tmp_folder):
    data = make_jpeg()
    r = client.post(
        "/api/admin/media/files",
        data={"folder_id": tmp_folder["id"]},
        files={"file": ("closet.jpg", io.BytesIO(data), "image/jpeg")},
        headers=auth_headers,
    )
    assert r.status_code == 201
    body = r.json()
    assert body["folder_id"] == tmp_folder["id"]
    assert body["image_path"].endswith(".jpg")
    assert body["original_name"] == "closet.jpg"
    # cleanup
    client.delete(f"/api/admin/media/files/{body['id']}", headers=auth_headers)


def test_upload_file_no_folder(client, auth_headers):
    data = make_jpeg()
    r = client.post(
        "/api/admin/media/files",
        files={"file": ("no-folder.jpg", io.BytesIO(data), "image/jpeg")},
        headers=auth_headers,
    )
    assert r.status_code == 201
    body = r.json()
    assert body["folder_id"] is None
    assert body["original_name"] == "no-folder.jpg"
    # cleanup
    client.delete(f"/api/admin/media/files/{body['id']}", headers=auth_headers)


def test_upload_png_accepted(client, auth_headers):
    from PIL import Image
    img = Image.new("RGBA", (2, 2))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    r = client.post(
        "/api/admin/media/files",
        files={"file": ("img.png", io.BytesIO(buf.getvalue()), "image/png")},
        headers=auth_headers,
    )
    assert r.status_code == 201
    client.delete(f"/api/admin/media/files/{r.json()['id']}", headers=auth_headers)


def test_upload_file_to_nonexistent_folder(client, auth_headers):
    data = make_jpeg()
    r = client.post(
        "/api/admin/media/files",
        data={"folder_id": 99999},
        files={"file": ("x.jpg", io.BytesIO(data), "image/jpeg")},
        headers=auth_headers,
    )
    assert r.status_code == 404


def test_upload_wrong_extension_rejected(client, auth_headers):
    r = client.post(
        "/api/admin/media/files",
        files={"file": ("evil.txt", io.BytesIO(b"not an image"), "text/plain")},
        headers=auth_headers,
    )
    assert r.status_code == 422


def test_upload_fake_image_rejected(client, auth_headers):
    """A file with .jpg extension but non-image content must be rejected."""
    r = client.post(
        "/api/admin/media/files",
        files={"file": ("fake.jpg", io.BytesIO(b"this is not jpeg data"), "image/jpeg")},
        headers=auth_headers,
    )
    assert r.status_code == 422


def test_delete_file(client, auth_headers):
    data = make_jpeg()
    r = client.post(
        "/api/admin/media/files",
        files={"file": ("del.jpg", io.BytesIO(data), "image/jpeg")},
        headers=auth_headers,
    )
    fid = r.json()["id"]
    r2 = client.delete(f"/api/admin/media/files/{fid}", headers=auth_headers)
    assert r2.status_code == 204
    # Should no longer appear in all-files list
    all_files = client.get("/api/admin/media/files", headers=auth_headers).json()
    assert not any(f["id"] == fid for f in all_files)


def test_delete_nonexistent_file(client, auth_headers):
    r = client.delete("/api/admin/media/files/99999", headers=auth_headers)
    assert r.status_code == 404


def test_filter_files_by_folder(client, auth_headers, tmp_file, tmp_folder):
    r = client.get(f"/api/admin/media/files?folder_id={tmp_folder['id']}", headers=auth_headers)
    assert r.status_code == 200
    files = r.json()
    assert len(files) >= 1
    assert all(f["folder_id"] == tmp_folder["id"] for f in files)


def test_filter_files_no_folder(client, auth_headers):
    # Upload an unassigned file
    data = make_jpeg()
    r = client.post(
        "/api/admin/media/files",
        files={"file": ("unassigned.jpg", io.BytesIO(data), "image/jpeg")},
        headers=auth_headers,
    )
    fid = r.json()["id"]

    unassigned = client.get("/api/admin/media/files?no_folder=true", headers=auth_headers).json()
    assert any(f["id"] == fid for f in unassigned)
    assert all(f["folder_id"] is None for f in unassigned)

    client.delete(f"/api/admin/media/files/{fid}", headers=auth_headers)


def test_upload_requires_auth():
    data = make_jpeg()
    with TestClient(app, raise_server_exceptions=True) as fresh:
        r = fresh.post(
            "/api/admin/media/files",
            files={"file": ("x.jpg", io.BytesIO(data), "image/jpeg")},
        )
        assert r.status_code == 401
