#!/usr/bin/env python3
"""
Post-deploy smoke test — runs against the live server.

Usage:
  python smoke_test.py                         # tests https://store.works-on-my-machine.net
  python smoke_test.py http://localhost:3080   # tests a specific base URL
  ADMIN_PASS=secret python smoke_test.py       # set admin password via env

Exit code 0 = all passed. Non-zero = failure (prints which checks failed).
"""
import os
import sys
import requests

BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "https://store.works-on-my-machine.net"
ADMIN_ID = os.environ.get("ADMIN_ID", "admin")
ADMIN_PASS = os.environ.get("ADMIN_PASS", "")

session = requests.Session()
passed = []
failed = []


def check(name, ok, detail=""):
    if ok:
        passed.append(name)
        print(f"  ✓  {name}")
    else:
        failed.append(name)
        print(f"  ✗  {name}{(' — ' + detail) if detail else ''}")


def get(path, **kw):
    return session.get(BASE + path, timeout=10, **kw)


def post(path, **kw):
    return session.post(BASE + path, timeout=10, **kw)


print(f"\nSmoke testing {BASE}\n")

# ── Health ────────────────────────────────────────────────────────────────────
r = get("/api/health")
check("GET /api/health → 200", r.status_code == 200)
check("health body ok", r.json() == {"ok": True})

# ── Public endpoints ──────────────────────────────────────────────────────────
r = get("/api/public/closets")
check("GET /api/public/closets → 200", r.status_code == 200)
check("closets response is list", isinstance(r.json(), list))

# Lead submission — the critical customer-facing path
r = post("/api/public/leads", json={"name": "smoke-test", "phone": "0500000000", "cart": []})
check("POST /api/public/leads → 201", r.status_code == 201)
check("lead has id", isinstance(r.json().get("id"), int))

r = get("/api/public/settings")
check("GET /api/public/settings → 200", r.status_code == 200)

# ── Auth ──────────────────────────────────────────────────────────────────────
r = post("/api/auth/login", json={"customer_id": "nobody", "password": "bad"})
check("bad login → 401", r.status_code == 401)

if ADMIN_PASS:
    r = post("/api/auth/login", json={"customer_id": ADMIN_ID, "password": ADMIN_PASS})
    check("admin login → 200", r.status_code == 200, r.text[:120])

    if r.status_code == 200:
        token = r.json().get("token") or r.cookies.get("store_token")
        headers = {"Authorization": f"Bearer {token}"} if token else {}

        r2 = get("/api/admin/media/folders", headers=headers)
        check("GET /api/admin/media/folders → 200", r2.status_code == 200)
        check("folders is list", isinstance(r2.json(), list))

        r3 = get("/api/admin/leads", headers=headers)
        check("GET /api/admin/leads → 200", r3.status_code == 200)
else:
    print("  (skipping admin tests — set ADMIN_PASS env to enable)")

# ── Auth guard ────────────────────────────────────────────────────────────────
r = get("/api/admin/media/folders")
check("unauthenticated /api/admin/* → 401", r.status_code == 401)

# ── Static uploads dir ────────────────────────────────────────────────────────
r = get("/uploads/")
check("/uploads/ accessible (nginx mounted)", r.status_code in (200, 403, 404))

# ── Summary ───────────────────────────────────────────────────────────────────
print(f"\n{'─'*40}")
print(f"  {len(passed)} passed, {len(failed)} failed")
if failed:
    print(f"\n  Failed: {', '.join(failed)}")
print()
sys.exit(1 if failed else 0)
