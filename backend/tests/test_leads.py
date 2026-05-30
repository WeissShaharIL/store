"""
Lead submission and admin lead management tests.
Lead submission is the critical customer-facing path — these tests
must always pass before a deploy.
"""

VALID_LEAD = {
    "name": "ישראל ישראלי",
    "phone": "0501234567",
    "cart": [{"id": "c1", "name": "ארון הזזה", "templateId": 1}],
}


def test_submit_lead(client):
    r = client.post("/api/public/leads", json=VALID_LEAD)
    assert r.status_code == 201
    body = r.json()
    assert body["name"] == "ישראל ישראלי"
    assert body["phone"] == "0501234567"
    assert body["status"] == "new"
    assert isinstance(body["id"], int)
    return body["id"]


def test_submit_lead_minimal(client):
    """Only name + phone required; email/address/notes optional."""
    r = client.post("/api/public/leads", json={"name": "שם", "phone": "0521234567", "cart": []})
    assert r.status_code == 201


def test_submit_lead_with_optional_fields(client):
    r = client.post("/api/public/leads", json={
        **VALID_LEAD,
        "email": "test@example.com",
        "address": "תל אביב",
        "notes": "בקשה מיוחדת",
    })
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == "test@example.com"
    assert body["address"] == "תל אביב"
    assert body["notes"] == "בקשה מיוחדת"


def test_submit_lead_missing_name(client):
    r = client.post("/api/public/leads", json={"phone": "0501234567", "cart": []})
    assert r.status_code == 422


def test_submit_lead_missing_phone(client):
    r = client.post("/api/public/leads", json={"name": "שם", "cart": []})
    assert r.status_code == 422


def test_admin_list_leads(client, auth_headers):
    # Submit one first so the list is non-empty
    client.post("/api/public/leads", json=VALID_LEAD)
    r = client.get("/api/admin/leads", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    assert len(r.json()) >= 1


def test_admin_list_leads_requires_auth(client):
    from fastapi.testclient import TestClient
    from main import app
    with TestClient(app, raise_server_exceptions=True) as fresh:
        r = fresh.get("/api/admin/leads")
        assert r.status_code == 401


def test_admin_get_lead(client, auth_headers):
    # Create a fresh lead and retrieve it
    r = client.post("/api/public/leads", json={**VALID_LEAD, "name": "get-test"})
    lead_id = r.json()["id"]

    r2 = client.get(f"/api/admin/leads/{lead_id}", headers=auth_headers)
    assert r2.status_code == 200
    assert r2.json()["id"] == lead_id
    assert r2.json()["name"] == "get-test"


def test_admin_update_lead_status(client, auth_headers):
    r = client.post("/api/public/leads", json={**VALID_LEAD, "name": "update-test"})
    lead_id = r.json()["id"]

    r2 = client.patch(
        f"/api/admin/leads/{lead_id}",
        json={"status": "contacted"},
        headers=auth_headers,
    )
    assert r2.status_code == 200
    assert r2.json()["status"] == "contacted"


def test_admin_update_lead_notes(client, auth_headers):
    r = client.post("/api/public/leads", json=VALID_LEAD)
    lead_id = r.json()["id"]

    r2 = client.patch(
        f"/api/admin/leads/{lead_id}",
        json={"admin_notes": "צלצלתי, לא ענה"},
        headers=auth_headers,
    )
    assert r2.status_code == 200
    assert r2.json()["admin_notes"] == "צלצלתי, לא ענה"


def test_admin_soft_delete_lead(client, auth_headers):
    r = client.post("/api/public/leads", json={**VALID_LEAD, "name": "delete-test"})
    lead_id = r.json()["id"]

    r2 = client.delete(f"/api/admin/leads/{lead_id}", headers=auth_headers)
    assert r2.status_code in (200, 204)

    # Should not appear in active leads anymore
    leads = client.get("/api/admin/leads", headers=auth_headers).json()
    active_ids = [l["id"] for l in leads if l.get("deleted_at") is None]
    assert lead_id not in active_ids


def test_admin_unread_count(client, auth_headers):
    r = client.get("/api/admin/leads/unread-count", headers=auth_headers)
    assert r.status_code == 200
    assert "count" in r.json()


def test_admin_lead_counts(client, auth_headers):
    client.post("/api/public/leads", json=VALID_LEAD)
    r = client.get("/api/admin/leads/counts", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    for key in ("all", "new", "contacted", "closed"):
        assert key in body
        assert isinstance(body[key], int)
    assert body["all"] >= 1


def test_admin_lead_counts_requires_auth(client):
    from fastapi.testclient import TestClient
    from main import app
    with TestClient(app, raise_server_exceptions=True) as fresh:
        assert fresh.get("/api/admin/leads/counts").status_code == 401


def test_admin_export_csv(client, auth_headers):
    client.post("/api/public/leads", json={**VALID_LEAD, "name": "csv-export-test"})
    r = client.get("/api/admin/leads/export.csv", headers=auth_headers)
    assert r.status_code == 200
    assert "text/csv" in r.headers["content-type"]
    body = r.text
    assert "csv-export-test" in body
    assert body.startswith("﻿")  # BOM for Excel/Hebrew


def test_get_lead_does_not_change_status(client, auth_headers):
    """Viewing a new lead must NOT silently flip its status to contacted."""
    r = client.post("/api/public/leads", json={**VALID_LEAD, "name": "status-stable"})
    lead_id = r.json()["id"]
    assert r.json()["status"] == "new"
    got = client.get(f"/api/admin/leads/{lead_id}", headers=auth_headers).json()
    assert got["status"] == "new"
    # And it stays new on the next fetch.
    again = client.get(f"/api/admin/leads/{lead_id}", headers=auth_headers).json()
    assert again["status"] == "new"
