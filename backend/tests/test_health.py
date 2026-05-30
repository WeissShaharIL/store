"""Health and auth smoke tests — should always pass pre- and post-deploy."""


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"ok": True}


def test_login_bad_credentials(client):
    r = client.post("/api/auth/login", json={"customer_id": "nobody", "password": "wrong"})
    assert r.status_code == 401


def test_admin_login(client, admin_token):
    assert admin_token is not None


def test_protected_route_requires_auth(client):
    r = client.get("/api/admin/media/folders")
    assert r.status_code == 401


def test_protected_route_with_auth(client, auth_headers):
    r = client.get("/api/admin/media/folders", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
