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

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-insecure-change-me")
ALGORITHM = "HS256"
TOKEN_TTL_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "customer_id": user.customer_id,
        "is_admin": user.is_admin,
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
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="דרושות הרשאות מנהל")
    return user
