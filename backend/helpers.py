import io
import json
import logging
import os
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import HTTPException, UploadFile
from PIL import Image
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from discounts import apply_discounts
from models import (
    Catalog,
    CustomerItem,
    Item,
    Logo,
    MediaFile,
    Order,
    Setting,
    User,
    catalog_items_membership,
)
from schemas import CatalogItem, OrderLineOut, OrderOut

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "./uploads")).resolve()
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


def parse_cart(snapshot: Optional[str]) -> list:
    """Parse a JSON cart snapshot into a list.

    Tolerant of `None`, malformed JSON, and non-list payloads — always returns a
    list so callers never have to guard. Centralizes the parse-and-fallback block
    that was previously copy-pasted across the leads/orders routers and notify.
    """
    try:
        cart = json.loads(snapshot or "[]")
    except (TypeError, ValueError):
        return []
    return cart if isinstance(cart, list) else []


def save_upload(file: UploadFile) -> str:
    """Save an uploaded image to UPLOAD_DIR. Returns the bare filename."""
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"סוג קובץ לא נתמך. מותר: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Read in bounded chunks so an oversized upload can't exhaust memory before
    # we reject it — we never buffer more than MAX_FILE_SIZE (+ one chunk).
    data = bytearray()
    while True:
        chunk = file.file.read(1024 * 1024)
        if not chunk:
            break
        data.extend(chunk)
        if len(data) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="הקובץ גדול מדי (מקסימום 5MB)")

    try:
        img = Image.open(io.BytesIO(bytes(data)))
        img.verify()
    except Exception:
        raise HTTPException(status_code=422, detail="הקובץ אינו תמונה תקינה")

    filename = f"{uuid.uuid4().hex}.{ext}"
    dest = UPLOAD_DIR / filename
    dest.write_bytes(data)
    return filename


def delete_upload(image_path: str | None) -> None:
    """Delete an upload file if it exists. Silent on missing files."""
    if not image_path:
        return
    target = UPLOAD_DIR / image_path
    try:
        target.unlink()
    except FileNotFoundError:
        pass


def register_media(db: Session, filename: str | None, original_name: str | None = None) -> None:
    """Record an uploaded image in the media library (idempotent by path).

    Every image that lands on disk should have a matching MediaFile row so it
    appears in the admin תמונות tab. Callers must still commit the session.
    """
    if not filename:
        return
    exists = db.query(MediaFile).filter(MediaFile.image_path == filename).first()
    if exists:
        return
    db.add(MediaFile(folder_id=None, image_path=filename, original_name=original_name))


def unregister_media(db: Session, image_path: str | None) -> None:
    """Delete the file from disk AND remove its MediaFile row(s).

    Use this anywhere an entity's image is replaced or deleted, so the media
    library never accumulates rows pointing at files that no longer exist.
    Callers must still commit the session.
    """
    if not image_path:
        return
    db.query(MediaFile).filter(MediaFile.image_path == image_path).delete(synchronize_session=False)
    delete_upload(image_path)


def active_catalog_id(db: Session) -> int:
    """ID of the active catalog, or fall back to the lowest-id catalog.

    Returns 0 if no catalogs exist — membership-table joins match nothing
    rather than throwing. Useful for fresh installs before seed runs.
    """
    cat = db.query(Catalog).filter(Catalog.is_active.is_(True)).first()
    if not cat:
        cat = db.query(Catalog).order_by(Catalog.id).first()
    if not cat:
        logger.warning("active_catalog_id: no catalogs found in database")
        return 0
    return cat.id


def active_logo_path(db: Session) -> Optional[str]:
    """Image filename of the currently active logo, or None."""
    row = db.query(Logo).filter(Logo.is_active.is_(True)).first()
    return row.image_path if row else None


def pdf_footer_text(db: Session) -> Optional[str]:
    """The admin-configured PDF footer string, or None if blank/unset."""
    row = db.query(Setting).filter(Setting.key == "pdf_footer").one_or_none()
    return (row.value or None) if row else None


def resolve_customer_catalog(
    db: Session, user: User, *, include_hidden: bool = False
) -> List[CatalogItem]:
    """Build the per-customer catalog view.

    Loads this user's overrides, joins items via the active catalog's
    membership table, swaps in override prices, and attaches discount fields.
    Set include_hidden=True to keep items the customer has hidden — used by
    admin "view as customer". Customer-facing endpoints leave hidden items out.
    """
    overrides = {
        ci.item_id: ci
        for ci in db.query(CustomerItem).filter(CustomerItem.user_id == user.id).all()
    }
    active_cid = active_catalog_id(db)
    items = (
        db.query(Item)
        .join(catalog_items_membership, Item.id == catalog_items_membership.c.item_id)
        .filter(catalog_items_membership.c.catalog_id == active_cid)
        .order_by(Item.category, Item.name)
        .all()
    )
    result: list[CatalogItem] = []
    for item in items:
        ov = overrides.get(item.id)
        if ov and ov.hidden and not include_hidden:
            continue
        price = ov.price_override if (ov and ov.price_override is not None) else item.base_price
        result.append(
            CatalogItem(
                id=item.id,
                product_code=item.product_code,
                name=item.name,
                description=item.description,
                category=item.category,
                base_price=item.base_price,
                price=price,
                image_path=item.image_path,
                hidden=bool(ov and ov.hidden),
                **apply_discounts(price, user),
            )
        )
    return result


def order_to_out(order: Order, user: User) -> OrderOut:
    """Serialize a SQLAlchemy Order to OrderOut. Shared by me/ and admin routers."""
    return OrderOut(
        id=order.id,
        user_id=user.id,
        customer_id=user.customer_id,
        display_name=user.display_name,
        created_at=order.created_at,
        delivered_at=order.delivered_at,
        notes=order.notes,
        total_amount=order.total_amount,
        lines=[OrderLineOut.model_validate(l) for l in order.lines],
    )
