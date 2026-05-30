"""Auth tests including change-password."""


def test_change_password_wrong_current(client, auth_headers):
    r = client.post(
        "/api/auth/change-password",
        json={"current_password": "definitely-wrong", "new_password": "newpass123"},
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


def test_change_password_success(client, auth_headers):
    r = client.post(
        "/api/auth/change-password",
        json={"current_password": "test-admin-pass", "new_password": "new-test-pass"},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json() == {"ok": True}

    # Can now log in with new password
    r2 = client.post("/api/auth/login", json={"customer_id": "admin", "password": "new-test-pass"})
    assert r2.status_code == 200

    # Restore original password so other tests still work
    new_headers = {"Authorization": f"Bearer {r2.json().get('token', '')}"}
    client.post(
        "/api/auth/change-password",
        json={"current_password": "new-test-pass", "new_password": "test-admin-pass"},
        headers=new_headers,
    )


def test_change_password_requires_auth(client):
    r = client.post(
        "/api/auth/change-password",
        json={"current_password": "anything", "new_password": "newpass123"},
    )
    assert r.status_code == 401
