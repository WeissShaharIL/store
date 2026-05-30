import json
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from auth import require_admin
from db import get_db
from models import ActivityEvent

router = APIRouter(dependencies=[Depends(require_admin)])

ACTION_LABELS = {
    "lead_submitted":     "פנייה חדשה",
    "admin_login":        "כניסת מנהל",
    "admin_login_failed": "ניסיון כניסה נכשל",
    "template_created":   "תבנית נוצרה",
    "template_updated":   "תבנית עודכנה",
    "template_deleted":   "תבנית נמחקה",
    "image_uploaded":     "תמונה הועלתה",
}


class ActivityEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    action: str
    action_label: str
    actor: Optional[str]
    ip: Optional[str]
    details: Optional[dict]
    created_at: datetime


@router.get("", response_model=List[ActivityEventOut])
def list_activity(
    action: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    q = db.query(ActivityEvent).order_by(ActivityEvent.created_at.desc())
    if action:
        q = q.filter(ActivityEvent.action == action)
    rows = q.limit(limit).all()
    return [_to_out(r) for r in rows]


def _to_out(row: ActivityEvent) -> ActivityEventOut:
    details = None
    if row.details:
        try:
            details = json.loads(row.details)
        except Exception:
            details = {"raw": row.details}
    return ActivityEventOut(
        id=row.id,
        action=row.action,
        action_label=ACTION_LABELS.get(row.action, row.action),
        actor=row.actor,
        ip=row.ip,
        details=details,
        created_at=row.created_at,
    )
