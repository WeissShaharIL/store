import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Cookie, Depends, Header, HTTPException
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from db import get_db
from models import User

COOKIE_NAME = "store_token"

# A real SECRET_KEY is mandatory in production. We treat "running on the SQLite
# dev fallback" as the only safe place to fall back to a throwaway key — exactly
# the dev/prod split db.py already uses. With a real (non-sqlite) DATABASE_URL we
# refuse to boot without an explicit key, otherwise every JWT would be forgeable.
_DEV_SECRET = "dev-insecure-change-me"
_ON_SQLITE = os.environ.get("DATABASE_URL", "sqlite:///./store.db").startswith("sqlite")

SECRET_KEY = os.environ.get("SECRET_KEY", "").strip()
if not SECRET_KEY:
    if _ON_SQLITE:
        SECRET_KEY = _DEV_SECRET
    else:
        raise RuntimeError(
            "SECRET_KEY must be set in production — refusing to boot without it."
        )

ALGORITHM = "HS256"
TOKEN_TTL_DAYS = 7

# Single source of truth for the password policy — enforced everywhere a
# password is set (see validate_password_strength).
MIN_PASSWORD_LENGTH = 8

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def validate_password_strength(plain: str) -> None:
    """Raise 422 if the password is too weak. The single policy gate."""
    if len(plain or "") < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=422,
            detail=f"הסיסמה חייבת להכיל לפחות {MIN_PASSWORD_LENGTH} תווים",
        )


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "customer_id": user.customer_id,
        "is_admin": user.is_admin,
        "ver": user.token_version,
        "exp": datetime.now(timezone.utc) + timedelta(days=TOKEN_TTL_DAYS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _decode(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="טוקן לא תקין")


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    store_token: Optional[str] = Cookie(default=None, alias=COOKIE_NAME),
    db: Session = Depends(get_db),
) -> User:
    token: Optional[str] = None
    if store_token:
        token = store_token.strip() or None
    if not token and authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip() or None
    if not token:
        raise HTTPException(status_code=401, detail="נדרשת התחברות")
    payload = _decode(token)
    user_id = int(payload.get("sub", 0))
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="המשתמש לא קיים")
    # Token must carry the user's current version — a password change bumps it
    # and thereby invalidates every token issued before the change.
    if payload.get("ver", 0) != user.token_version:
        raise HTTPException(status_code=401, detail="פג תוקף ההתחברות, יש להתחבר מחדש")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="דרושות הרשאות מנהל")
    return user
