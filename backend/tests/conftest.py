"""
Pytest fixtures: in-memory SQLite DB + FastAPI TestClient.
Run:  cd backend && pytest tests/ -v

Module-level bootstrap (order matters):
  1. engine_test / SessionLocal created
  2. models imported → ORM classes registered with Base
  3. create_all → tables created in SQLite
  4. admin user seeded
  5. get_db overridden with SQLite session (must be generator function, NOT lambda)
  6. startup/shutdown events cleared → TestClient never touches Postgres
"""
import io, sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# ── 1. SQLite engine ──────────────────────────────────────────────────────────
# StaticPool: all connections share one SQLite handle so tables created by
# create_all() are visible to every session — critical for :memory: databases.
engine_test = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)

# ── 2 + 3. Register models → create tables ────────────────────────────────────
import models  # noqa: F401 — all model classes register with Base on import
from db import Base, get_db

Base.metadata.create_all(bind=engine_test)

# ── 4. Seed admin user ────────────────────────────────────────────────────────
from auth import hash_password
from models import User

_seed_db = TestingSessionLocal()
try:
    if not _seed_db.query(User).filter(User.customer_id == "admin").first():
        _seed_db.add(User(
            customer_id="admin",
            display_name="Admin",
            password_hash=hash_password("test-admin-pass"),
            is_admin=True,
        ))
        _seed_db.commit()
finally:
    _seed_db.close()

# ── 5 + 6. Wire override + suppress startup ───────────────────────────────────
from main import app

# Disable rate limiting for the suite so tests can hammer endpoints freely.
# Rate-limit enforcement is exercised in isolation in test_rate_limit.py, which
# flips this back on for the duration of one test.
from limiter import limiter
limiter.enabled = False


def _override_get_db():
    """Generator function (not lambda!) — FastAPI needs the generator protocol."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db

# Neutralize the app's lifespan: the suite manages its own engine + seeding
# above, and the real lifespan would run create_all/seed against the dev DB
# (and seed_admin requires ADMIN_PASSWORD). TestClient triggers the lifespan
# when used as a context manager, so replace it with a no-op.
from contextlib import asynccontextmanager


@asynccontextmanager
async def _noop_lifespan(_app):
    yield


app.router.lifespan_context = _noop_lifespan


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def client():
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


# Module-scoped (not session): a password change bumps the user's token_version,
# which invalidates older tokens. Re-logging in once per module guarantees each
# module starts with a token reflecting the current version.
@pytest.fixture(scope="module")
def admin_token(client):
    """Login as admin and return the JWT from the session cookie."""
    r = client.post("/api/auth/login", json={"customer_id": "admin", "password": "test-admin-pass"})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    token = r.cookies.get("store_token")
    assert token, "Login did not set store_token cookie"
    return token


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_jpeg() -> bytes:
    img = Image.new("RGB", (1, 1), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture
def tmp_folder(client, auth_headers):
    r = client.post("/api/admin/media/folders", data={"name": "tmp-test-folder"}, headers=auth_headers)
    assert r.status_code == 201
    folder = r.json()
    yield folder
    client.delete(f"/api/admin/media/folders/{folder['id']}", headers=auth_headers)


@pytest.fixture
def tmp_file(client, auth_headers, tmp_folder):
    data = make_jpeg()
    r = client.post(
        "/api/admin/media/files",
        data={"folder_id": tmp_folder["id"]},
        files={"file": ("test.jpg", io.BytesIO(data), "image/jpeg")},
        headers=auth_headers,
    )
    assert r.status_code == 201
    f = r.json()
    yield f
    client.delete(f"/api/admin/media/files/{f['id']}", headers=auth_headers)
