"""Public read-only API — no authentication required.

Serves data the public pages (showroom, display sale, guest catalog, designer) need.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from db import get_db
from limiter import limiter
from helpers import active_catalog_id
from models import (
    GUEST_CUSTOMER_ID,
    Catalog,
    HeroBanner,
    ClosetTemplate,
    DoorTypeCover,
    Handle,
    Item,
    Logo,
    Message,
    PaletteColor,
    Setting,
    User,
    catalog_items_membership,
)
from schemas import (
    CatalogItem,
    ClosetTemplateOut,
    DoorTypeCoverOut,
    HandleOut,
    HeroBannerOut,
    LogoOut,
    PaletteColorOut,
)

router = APIRouter()

# The only setting keys safe to expose to anonymous callers. Kept as a single
# named constant so the whitelist isn't buried inside the handler. The seed in
# bootstrap.DEFAULT_SETTINGS declares defaults for these.
PUBLIC_SETTING_KEYS = frozenset({
    "welcome_title",
    "welcome_subtitle",
    "contact_phone",
    "contact_whatsapp",
    "whatsapp_message",
    "hero_tagline",
    "about_text",
    "default_closet_image",
    "trust_items",
    "site_theme",
    "nav_font_size",
    "nav_items_json",
})


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
    rows = db.query(Setting).filter(Setting.key.in_(PUBLIC_SETTING_KEYS)).all()
    return {r.key: r.value for r in rows}


# ── Guest / customer portal public endpoints ──────────────────────────────────

@router.get("/catalog", response_model=List[CatalogItem])
def public_catalog(db: Session = Depends(get_db)):
    """Anonymous catalog: every item in the active catalog at its base price."""
    active_cid = active_catalog_id(db)
    if not active_cid:
        return []
    items = (
        db.query(Item)
        .join(catalog_items_membership, Item.id == catalog_items_membership.c.item_id)
        .filter(catalog_items_membership.c.catalog_id == active_cid)
        .order_by(Item.category, Item.name)
        .all()
    )
    return [
        CatalogItem(
            id=i.id,
            product_code=i.product_code,
            name=i.name,
            description=i.description,
            category=i.category,
            base_price=i.base_price,
            price=i.base_price,
            image_path=i.image_path,
            hidden=False,
        )
        for i in items
    ]


class GuestContact(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    contact: str = Field(min_length=1, max_length=128)
    body: str = Field(min_length=1, max_length=2000)


def _first_admin(db: Session) -> User:
    user = (
        db.query(User)
        .filter(User.is_admin.is_(True), User.deleted_at.is_(None))
        .order_by(User.id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=500, detail="לא נמצא מנהל לשליחת ההודעה")
    return user


def _guest_user(db: Session) -> User:
    user = (
        db.query(User)
        .filter(User.customer_id == GUEST_CUSTOMER_ID, User.deleted_at.is_(None))
        .first()
    )
    if not user:
        raise HTTPException(status_code=500, detail="חשבון האורח לא הוגדר")
    return user


@router.post("/contact", status_code=201)
@limiter.limit("10/minute")
def public_contact(payload: GuestContact, request: Request, db: Session = Depends(get_db)):
    admin = _first_admin(db)
    guest = _guest_user(db)
    composed = (
        f"שם: {payload.name.strip()}\n"
        f"דרך יצירת קשר: {payload.contact.strip()}\n"
        f"\n{payload.body.strip()}"
    )
    db.add(Message(sender_id=guest.id, recipient_id=admin.id, body=composed))
    db.commit()
    return {"ok": True}


@router.get("/hero-banners", response_model=List[HeroBannerOut])
def list_public_hero_banners(db: Session = Depends(get_db)):
    rows = (
        db.query(HeroBanner)
        .order_by(HeroBanner.sort_order, HeroBanner.created_at)
        .all()
    )
    return [HeroBannerOut.model_validate(r) for r in rows]
