"""Admin-only landing page settings management.

Landing settings are stored as regular Setting rows. This router
provides a thin wrapper so the admin tab has a focused endpoint
rather than calling the generic /api/settings PATCH with a mixed
payload.
"""
from typing import Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import require_admin
from db import get_db
from models import Setting

router = APIRouter(dependencies=[Depends(require_admin)])

LANDING_KEYS = {
    "welcome_title",
    "welcome_subtitle",
    "contact_phone",
    "contact_whatsapp",
    "hero_tagline",
    "about_text",
}


@router.get("")
def get_landing_settings(db: Session = Depends(get_db)) -> Dict[str, str]:
    rows = db.query(Setting).filter(Setting.key.in_(LANDING_KEYS)).all()
    return {r.key: r.value for r in rows}


@router.patch("")
def update_landing_settings(
    payload: Dict[str, str], db: Session = Depends(get_db)
) -> Dict[str, str]:
    for key, value in payload.items():
        if key not in LANDING_KEYS:
            continue
        row = db.query(Setting).filter(Setting.key == key).one_or_none()
        if row:
            row.value = value
        else:
            db.add(Setting(key=key, value=value))
    db.commit()
    rows = db.query(Setting).filter(Setting.key.in_(LANDING_KEYS)).all()
    return {r.key: r.value for r in rows}
