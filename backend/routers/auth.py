import os

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from auth import (
    COOKIE_NAME,
    TOKEN_TTL_DAYS,
    create_token,
    get_current_user,
    verify_password,
)
from db import get_db
from models import User
from schemas import LoginRequest, LoginResponse

router = APIRouter()

_COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"
_COOKIE_SAMESITE = os.environ.get("COOKIE_SAMESITE", "strict")


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.customer_id == payload.customer_id).one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="שם משתמש או סיסמה שגויים")

    token = create_token(user)
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite=_COOKIE_SAMESITE,
        max_age=TOKEN_TTL_DAYS * 86400,
        path="/",
    )
    return LoginResponse(
        id=user.id,
        customer_id=user.customer_id,
        display_name=user.display_name,
        is_admin=user.is_admin,
    )


@router.post("/logout")
def logout(response: Response, _: User = Depends(get_current_user)):
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return {"ok": True}
