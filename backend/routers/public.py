"""Public read-only API — no authentication required.

Serves data the public pages (showroom, display sale, designer) need.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db import get_db
from models import ClosetTemplate, DoorTypeCover, Handle, Logo, PaletteColor, Setting
from schemas import (
    ClosetTemplateOut,
    DoorTypeCoverOut,
    HandleOut,
    LogoOut,
    PaletteColorOut,
)

router = APIRouter()


@router.get("/closets", response_model=List[ClosetTemplateOut])
def list_public_closets(
    door_kind: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """All ready (published) closet templates for the showroom."""
    q = db.query(ClosetTemplate).filter(
        ClosetTemplate.is_ready.is_(True),
        ClosetTemplate.is_display_sale.is_(False),
    )
    rows = q.order_by(ClosetTemplate.updated_at.desc()).all()
    return [ClosetTemplateOut.model_validate(r) for r in rows]


@router.get("/closets/display-sale", response_model=List[ClosetTemplateOut])
def list_display_sale(db: Session = Depends(get_db)):
    """Ready models marked as display-sale floor units."""
    rows = (
        db.query(ClosetTemplate)
        .filter(
            ClosetTemplate.is_ready.is_(True),
            ClosetTemplate.is_display_sale.is_(True),
        )
        .order_by(ClosetTemplate.updated_at.desc())
        .all()
    )
    return [ClosetTemplateOut.model_validate(r) for r in rows]


@router.get("/closets/{template_id}", response_model=ClosetTemplateOut)
def get_public_closet(template_id: int, db: Session = Depends(get_db)):
    from fastapi import HTTPException
    row = db.get(ClosetTemplate, template_id)
    if row is None or not row.is_ready:
        raise HTTPException(status_code=404, detail="ארון לא נמצא")
    return ClosetTemplateOut.model_validate(row)


@router.get("/palette-colors", response_model=List[PaletteColorOut])
def list_public_colors(db: Session = Depends(get_db)):
    rows = db.query(PaletteColor).order_by(PaletteColor.sort_order, PaletteColor.id).all()
    return [PaletteColorOut.model_validate(r) for r in rows]


@router.get("/handles", response_model=List[HandleOut])
def list_public_handles(db: Session = Depends(get_db)):
    rows = db.query(Handle).order_by(Handle.sort_order, Handle.id).all()
    return [HandleOut.model_validate(r) for r in rows]


@router.get("/door-type-covers", response_model=List[DoorTypeCoverOut])
def list_door_type_covers(db: Session = Depends(get_db)):
    rows = db.query(DoorTypeCover).all()
    return [DoorTypeCoverOut.model_validate(r) for r in rows]


@router.get("/logo", response_model=Optional[LogoOut])
def get_active_logo(db: Session = Depends(get_db)):
    row = db.query(Logo).filter(Logo.is_active.is_(True)).first()
    if row is None:
        return None
    return LogoOut.model_validate(row)


@router.get("/settings")
def get_public_settings(db: Session = Depends(get_db)):
    PUBLIC_KEYS = {
        "welcome_title",
        "welcome_subtitle",
        "contact_phone",
        "contact_whatsapp",
        "hero_tagline",
        "about_text",
    }
    rows = db.query(Setting).filter(Setting.key.in_(PUBLIC_KEYS)).all()
    return {r.key: r.value for r in rows}
