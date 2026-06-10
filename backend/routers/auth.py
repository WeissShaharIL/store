import os

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from pydantic import BaseModel

from auth import (
    COOKIE_NAME,
    TOKEN_TTL_DAYS,
    create_token,
    get_current_user,
    hash_password,
    require_admin,
    validate_password_strength,
    verify_password,
)
from db import get_db
from limiter import limiter
from models import User
from schemas import LoginRequest, LoginResponse
import activity as act


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

router = APIRouter()

_COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"
_COOKIE_SAMESITE = os.environ.get("COOKIE_SAMESITE", "strict")


def _set_auth_cookie(response: Response, user: User) -> None:
    """Issue a fresh JWT cookie for the user. Shared by login and password change."""
    response.set_cookie(
        key=COOKIE_NAME,
        value=create_token(user),
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite=_COOKIE_SAMESITE,
        max_age=TOKEN_TTL_DAYS * 86400,
        path="/",
    )


@router.post("/login", response_model=LoginResponse)
@limiter.limit("10/minute")
def login(payload: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.customer_id == payload.customer_id).one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        if user and user.is_admin:
            act.record(db, "admin_login_failed", request=request,
                       details={"customer_id": payload.customer_id})
        raise HTTPException(status_code=401, detail="שם משתמש או סיסמה שגויים")

    if user.is_admin:
        act.record(db, "admin_login", request=request, actor=user.display_name)
    _set_auth_cookie(response, user)
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


@router.post("/change-password")
@limiter.limit("10/minute")
def change_password(
    request: Request,
    payload: ChangePasswordRequest,
    response: Response,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=401, detail="הסיסמה הנוכחית שגויה")
    validate_password_strength(payload.new_password)
    user.password_hash = hash_password(payload.new_password)
    # Invalidate all tokens issued before this change, then re-issue one for
    # the current session so the admin isn't logged out by their own change.
    user.token_version += 1
    db.commit()
    _set_auth_cookie(response, user)
    return {"ok": True}
