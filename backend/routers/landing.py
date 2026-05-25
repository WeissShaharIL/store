"""Admin-only landing page settings management.

Landing settings are stored as regular Setting rows. This router
provides a thin wrapper so the admin tab has a focused endpoint
rather than calling the generic /api/settings PATCH with a mixed
payload.
"""
from typing import Dict

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from auth import require_admin
from db import get_db
from helpers import delete_upload, save_upload
from models import Setting

router = APIRouter(dependencies=[Depends(require_admin)])

LANDING_KEYS = {
    "welcome_title",
    "welcome_subtitle",
    "contact_phone",
    "contact_whatsapp",
    "hero_tagline",
    "about_text",
    "trust_items",  # JSON array of {title, body} objects
}

DEFAULT_CLOSET_IMAGE_KEY = "default_closet_image"


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


@router.post("/image/default-closet")
def upload_default_closet_image(
    file: UploadFile = File(...), db: Session = Depends(get_db)
):
    """Upload the fallback image shown on closet cards that have no own photo."""
    # Delete old file if one exists
    existing = db.query(Setting).filter(Setting.key == DEFAULT_CLOSET_IMAGE_KEY).one_or_none()
    if existing:
        delete_upload(existing.value)

    filename = save_upload(file)
    if existing:
        existing.value = filename
    else:
        db.add(Setting(key=DEFAULT_CLOSET_IMAGE_KEY, value=filename))
    db.commit()
    return {"image_path": filename}


@router.delete("/image/default-closet", status_code=204)
def delete_default_closet_image(db: Session = Depends(get_db)):
    """Remove the default closet fallback image."""
    row = db.query(Setting).filter(Setting.key == DEFAULT_CLOSET_IMAGE_KEY).one_or_none()
    if row:
        delete_upload(row.value)
        db.delete(row)
        db.commit()
