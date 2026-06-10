from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from auth import (
    get_current_user,
    hash_password,
    validate_password_strength,
    verify_password,
)
from db import get_db
from models import User
from schemas import MeResponse, PasswordChange, ProfileUpdate
from routers.auth import _set_auth_cookie

router = APIRouter()


@router.patch("/password", status_code=204)
def change_my_password(
    payload: PasswordChange,
    response: Response,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="הסיסמה הנוכחית שגויה")
    validate_password_strength(payload.new_password)
    user.password_hash = hash_password(payload.new_password)
    # Revoke prior tokens, then refresh this session's cookie.
    user.token_version += 1
    db.commit()
    _set_auth_cookie(response, user)


@router.patch("/profile", response_model=MeResponse)
def update_my_profile(
    payload: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.display_name is not None:
        user.display_name = payload.display_name.strip()
    if payload.phone is not None:
        trimmed = payload.phone.strip()
        user.phone = trimmed or None
    db.commit()
    db.refresh(user)
    return MeResponse(
        id=user.id,
        customer_id=user.customer_id,
        display_name=user.display_name,
        is_admin=user.is_admin,
        phone=user.phone,
    )
