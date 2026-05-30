"""
Lightweight activity recording — swallows all DB errors so audit failures
never block customer requests.
"""
import json
import logging
from typing import Optional

from fastapi import Request
from sqlalchemy.orm import Session

from models import ActivityEvent

logger = logging.getLogger(__name__)


def _client_ip(request: Optional[Request]) -> Optional[str]:
    if not request:
        return None
    # Cloudflare / proxy header first
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return getattr(request.client, "host", None)


def record(
    db: Session,
    action: str,
    *,
    request: Optional[Request] = None,
    actor: Optional[str] = None,
    details: Optional[dict] = None,
) -> None:
    try:
        event = ActivityEvent(
            action=action,
            actor=actor,
            ip=_client_ip(request),
            details=json.dumps(details, ensure_ascii=False) if details else None,
        )
        db.add(event)
        db.commit()
    except Exception:
        logger.debug("activity.record failed — swallowing error", exc_info=True)
