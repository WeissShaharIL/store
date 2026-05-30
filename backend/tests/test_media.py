"""Media library CRUD tests."""
import io


def test_list_folders_empty(client, auth_headers):
    r = client.get("/api/admin/media/folders", headers=auth_headers)
    assert r.status_code == 200
    assert r.json() == []


def test_create_folder(client, auth_headers):
    r = client.post(
        "/api/admin/media/folders",
        data={"name": "ארונות הזזה"},
        headers=auth_headers,
    )
    assert r.status_code == 201
    body = r.json()
    assert body["name"] == "ארונות הזזה"
    assert body["file_count"] == 0
    return body["id"]


def test_create_folder_empty_name(client, auth_headers):
    r = client.post(
        "/api/admin/media/folders",
        data={"name": "   "},
        headers=auth_headers,
    )
    assert r.status_code == 422


def test_folder_appears_in_list(client, auth_headers):
    r = client.get("/api/admin/media/folders", headers=auth_headers)
    assert r.status_code == 200
    names = [f["name"] for f in r.json()]
    assert "ארונות הזזה" in names


def test_list_files_empty(client, auth_headers):
    r = client.get("/api/admin/media/files", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def _make_image_bytes():
    """1×1 white JPEG for upload tests."""
    from PIL import Image
    import io
    img = Image.new("RGB", (1, 1), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_upload_file_no_folder(client, auth_headers):
    data = _make_image_bytes()
    r = client.post(
        "/api/admin/media/files",
        files={"file": ("test.jpg", io.BytesIO(data), "image/jpeg")},
        headers=auth_headers,
    )
    assert r.status_code == 201
    body = r.json()
    assert body["image_path"].endswith(".jpg")
    assert body["folder_id"] is None
    assert body["original_name"] == "test.jpg"
    return body["id"]


def test_upload_file_to_folder(client, auth_headers):
    # Get folder id
    folders = client.get("/api/admin/media/folders", headers=auth_headers).json()
    folder_id = next((f["id"] for f in folders if f["name"] == "ארונות הזזה"), None)
    assert folder_id is not None

    data = _make_image_bytes()
    r = client.post(
        "/api/admin/media/files",
        data={"folder_id": folder_id},
        files={"file": ("closet.jpg", io.BytesIO(data), "image/jpeg")},
        headers=auth_headers,
    )
    assert r.status_code == 201
    body = r.json()
    assert body["folder_id"] == folder_id


def test_list_files_by_folder(client, auth_headers):
    folders = client.get("/api/admin/media/folders", headers=auth_headers).json()
    folder_id = next((f["id"] for f in folders if f["name"] == "ארונות הזזה"), None)
    r = client.get(f"/api/admin/media/files?folder_id={folder_id}", headers=auth_headers)
    assert r.status_code == 200
    files = r.json()
    assert len(files) >= 1
    assert all(f["folder_id"] == folder_id for f in files)


def test_list_files_no_folder(client, auth_headers):
    r = client.get("/api/admin/media/files?no_folder=true", headers=auth_headers)
    assert r.status_code == 200
    files = r.json()
    assert all(f["folder_id"] is None for f in files)


def test_delete_folder_moves_files(client, auth_headers):
    folders = client.get("/api/admin/media/folders", headers=auth_headers).json()
    folder_id = next((f["id"] for f in folders if f["name"] == "ארונות הזזה"), None)

    # Count files in folder before deletion
    before = client.get(f"/api/admin/media/files?folder_id={folder_id}", headers=auth_headers).json()
    assert len(before) >= 1

    # Delete folder
    r = client.delete(f"/api/admin/media/folders/{folder_id}", headers=auth_headers)
    assert r.status_code == 204

    # Files should now be unassigned
    after_unassigned = client.get("/api/admin/media/files?no_folder=true", headers=auth_headers).json()
    moved_paths = {f["image_path"] for f in before}
    still_there = [f for f in after_unassigned if f["image_path"] in moved_paths]
    assert len(still_there) == len(before)


def test_delete_nonexistent_folder(client, auth_headers):
    r = client.delete("/api/admin/media/folders/99999", headers=auth_headers)
    assert r.status_code == 404


def test_upload_invalid_extension(client, auth_headers):
    r = client.post(
        "/api/admin/media/files",
        files={"file": ("evil.txt", io.BytesIO(b"not an image"), "text/plain")},
        headers=auth_headers,
    )
    assert r.status_code == 422
