from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from auth import get_current_user
from db import get_db
from models import Message, User
from schemas import MessageCreate, MessageOut

router = APIRouter()


def _first_admin(db: Session) -> User:
    return (
        db.query(User)
        .filter(User.is_admin.is_(True), User.deleted_at.is_(None))
        .order_by(User.id)
        .first()
    )


@router.get("/messages", response_model=List[MessageOut])
def my_messages(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(Message)
        .filter(or_(Message.sender_id == user.id, Message.recipient_id == user.id))
        .order_by(Message.created_at.asc())
        .all()
    )


@router.post("/messages", response_model=MessageOut, status_code=201)
def send_my_message(
    payload: MessageCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    admin = _first_admin(db)
    if not admin:
        raise HTTPException(status_code=404, detail="לא נמצא מנהל לשליחת הודעה")
    msg = Message(sender_id=user.id, recipient_id=admin.id, body=payload.body.strip())
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


@router.post("/messages/mark_read", status_code=204)
def mark_my_messages_read(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(Message).filter(
        Message.recipient_id == user.id,
        Message.read_at.is_(None),
    ).update({Message.read_at: datetime.now(timezone.utc)}, synchronize_session=False)
    db.commit()


@router.get("/messages/unread_count")
def my_unread_count(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = (
        db.query(Message)
        .filter(Message.recipient_id == user.id, Message.read_at.is_(None))
        .count()
    )
    return {"count": n}
