"""
Pytest fixtures: in-memory SQLite DB + FastAPI TestClient.
Run with:  cd backend && pytest tests/ -v
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from db import Base, get_db
from main import app

SQLALCHEMY_TEST_URL = "sqlite:///:memory:"

engine_test = create_engine(
    SQLALCHEMY_TEST_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    import models  # noqa: F401 — ensure all models are registered
    Base.metadata.create_all(bind=engine_test)
    yield
    Base.metadata.drop_all(bind=engine_test)


@pytest.fixture(scope="session")
def client(setup_db):
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="session")
def admin_token(client):
    """Log in as the seeded admin and return the Bearer token."""
    # The admin is seeded by bootstrap.seed_admin with credentials from env.
    # In tests, seed manually since startup event doesn't run in TestClient.
    from sqlalchemy.orm import Session
    from auth import hash_password
    from models import User

    db: Session = TestingSessionLocal()
    try:
        existing = db.query(User).filter(User.customer_id == "admin").first()
        if not existing:
            admin = User(
                customer_id="admin",
                display_name="Admin",
                password_hash=hash_password("test-admin-pass"),
                is_admin=True,
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()

    res = client.post("/api/auth/login", json={"customer_id": "admin", "password": "test-admin-pass"})
    assert res.status_code == 200
    return res.json().get("token") or res.cookies.get("store_token")


@pytest.fixture(scope="session")
def auth_headers(admin_token):
    if admin_token:
        return {"Authorization": f"Bearer {admin_token}"}
    return {}
