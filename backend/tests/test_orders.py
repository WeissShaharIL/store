"""Order lifecycle tests: create-from-lead, list/filter, status, delete."""
import json

VALID_LEAD = {
    "name": "מזמין הזמנה",
    "phone": "0509998877",
    "cart": [{"id": "c1", "name": "ארון", "templateId": 1,
              "snapshot": {"priceEstimate": 4200}}],
}


def _make_lead(client):
    r = client.post("/api/public/leads", json=VALID_LEAD)
    assert r.status_code == 201
    return r.json()["id"]


def test_create_order_from_lead(client, auth_headers):
    lead_id = _make_lead(client)
    r = client.post("/api/admin/orders", json={"lead_id": lead_id}, headers=auth_headers)
    assert r.status_code == 201
    body = r.json()
    assert body["lead_id"] == lead_id
    assert body["customer_name"] == "מזמין הזמנה"
    assert body["status"] == "new"
    assert body["total_amount"] == 4200
    assert len(body["cart"]) == 1


def test_create_order_closes_lead(client, auth_headers):
    lead_id = _make_lead(client)
    client.post("/api/admin/orders", json={"lead_id": lead_id}, headers=auth_headers)
    lead = client.get(f"/api/admin/leads/{lead_id}", headers=auth_headers).json()
    assert lead["status"] == "closed"


def test_create_order_missing_lead(client, auth_headers):
    r = client.post("/api/admin/orders", json={"lead_id": 999999}, headers=auth_headers)
    assert r.status_code == 404


def test_list_orders(client, auth_headers):
    _make_lead(client)
    lead_id = _make_lead(client)
    client.post("/api/admin/orders", json={"lead_id": lead_id}, headers=auth_headers)
    r = client.get("/api/admin/orders", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    assert len(r.json()) >= 1


def test_orders_require_auth(client):
    from fastapi.testclient import TestClient
    from main import app
    with TestClient(app, raise_server_exceptions=True) as fresh:
        assert fresh.get("/api/admin/orders").status_code == 401


def test_update_order_status(client, auth_headers):
    lead_id = _make_lead(client)
    oid = client.post("/api/admin/orders", json={"lead_id": lead_id}, headers=auth_headers).json()["id"]
    r = client.patch(f"/api/admin/orders/{oid}", json={"status": "in_production"}, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "in_production"


def test_update_order_invalid_status(client, auth_headers):
    lead_id = _make_lead(client)
    oid = client.post("/api/admin/orders", json={"lead_id": lead_id}, headers=auth_headers).json()["id"]
    r = client.patch(f"/api/admin/orders/{oid}", json={"status": "bogus"}, headers=auth_headers)
    assert r.status_code == 422


def test_order_counts(client, auth_headers):
    lead_id = _make_lead(client)
    client.post("/api/admin/orders", json={"lead_id": lead_id}, headers=auth_headers)
    r = client.get("/api/admin/orders/counts", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert "all" in body and body["all"] >= 1
    for s in ("new", "in_production", "ready", "delivered", "cancelled"):
        assert s in body


def test_filter_orders_by_name(client, auth_headers):
    lead_id = _make_lead(client)
    client.post("/api/admin/orders", json={"lead_id": lead_id}, headers=auth_headers)
    r = client.get("/api/admin/orders?q=מזמין", headers=auth_headers)
    assert r.status_code == 200
    assert all("מזמין" in o["customer_name"] for o in r.json())


def test_delete_order(client, auth_headers):
    lead_id = _make_lead(client)
    oid = client.post("/api/admin/orders", json={"lead_id": lead_id}, headers=auth_headers).json()["id"]
    assert client.delete(f"/api/admin/orders/{oid}", headers=auth_headers).status_code == 204
    assert client.get(f"/api/admin/orders/{oid}", headers=auth_headers).status_code == 404


def test_orders_csv_export(client, auth_headers):
    lead_id = _make_lead(client)
    client.post("/api/admin/orders", json={"lead_id": lead_id}, headers=auth_headers)
    r = client.get("/api/admin/orders/export.csv", headers=auth_headers)
    assert r.status_code == 200
    assert "text/csv" in r.headers["content-type"]
    assert r.text.startswith("﻿")
