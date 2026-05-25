"""Customer-side endpoints — composed from per-domain sub-modules.

`main.py` does `from routers import me as me_router` and mounts the
`router` exported here under `/api/me`. The bare `GET /api/me` lives
directly on the parent router because FastAPI rejects `include_router`
when both the include prefix and the sub-route path are empty.
"""
from fastapi import APIRouter, Depends

from auth import get_current_user
from models import User
from schemas import MeResponse

from . import announcements, catalog, messages, orders, profile

router = APIRouter()


@router.get("", response_model=MeResponse)
def me(user: User = Depends(get_current_user)):
    return MeResponse(
        id=user.id,
        customer_id=user.customer_id,
        display_name=user.display_name,
        is_admin=user.is_admin,
        phone=user.phone,
    )


router.include_router(profile.router)
router.include_router(catalog.router)
router.include_router(announcements.router)
router.include_router(messages.router)
router.include_router(orders.router)
