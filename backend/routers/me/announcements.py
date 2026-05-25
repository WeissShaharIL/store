from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from db import get_db
from models import Announcement, AnnouncementAck, User
from schemas import AnnouncementOut

router = APIRouter()


@router.get("/pending_announcement", response_model=Optional[AnnouncementOut])
def pending_announcement(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Most recent active announcement not yet acked by this user, or null.
    Always returns null for admin users — admins author broadcasts, they
    shouldn't be forced to acknowledge their own messages.
    """
    if user.is_admin:
        return None
    acked_ids = db.query(AnnouncementAck.announcement_id).filter(
        AnnouncementAck.user_id == user.id
    )
    return (
        db.query(Announcement)
        .filter(
            Announcement.is_active.is_(True),
            ~Announcement.id.in_(acked_ids),
        )
        .order_by(Announcement.created_at.desc())
        .first()
    )


@router.post("/announcements/{aid}/ack", status_code=204)
def ack_announcement(
    aid: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    a = db.get(Announcement, aid)
    if not a:
        raise HTTPException(status_code=404, detail="ההודעה לא נמצאה")
    existing = (
        db.query(AnnouncementAck)
        .filter(
            AnnouncementAck.announcement_id == aid,
            AnnouncementAck.user_id == user.id,
        )
        .first()
    )
    if existing:
        return  # already acked, no-op
    db.add(AnnouncementAck(announcement_id=aid, user_id=user.id))
    db.commit()
