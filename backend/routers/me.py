from fastapi import APIRouter, Depends

from auth import get_current_user
from models import User
from schemas import LoginResponse

router = APIRouter()


@router.get("", response_model=LoginResponse)
def get_me(user: User = Depends(get_current_user)):
    return LoginResponse(
        id=user.id,
        customer_id=user.customer_id,
        display_name=user.display_name,
        is_admin=user.is_admin,
    )
