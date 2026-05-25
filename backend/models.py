from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship

from db import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    customer_id = Column(String(64), unique=True, nullable=False, index=True)
    display_name = Column(String(128), nullable=False, default="")
    password_hash = Column(String(255), nullable=False)
    is_admin = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)


class ClosetTemplate(Base):
    """A 3D closet model authored in the admin builder.

    config_json holds the full ClosetConfig blob (validated by the
    frontend renderer). Stored as TEXT for SQLite test compatibility.

    is_ready toggles a model from draft to published. The showroom
    only surfaces ready models. is_display_sale marks ready models
    as one-off floor units offered at a fixed price.
    """

    __tablename__ = "closet_templates"

    id = Column(Integer, primary_key=True)
    name = Column(String(128), nullable=False)
    config_json = Column(Text, nullable=False)
    is_ready = Column(Boolean, nullable=False, default=False, index=True)
    image_path = Column(String(255), nullable=True)
    is_display_sale = Column(Boolean, nullable=False, default=False, index=True)
    display_sale_price = Column(String(32), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = Column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )


class PaletteColor(Base):
    """One admin-managed color in the closet builder's palette."""

    __tablename__ = "palette_colors"

    id = Column(Integer, primary_key=True)
    color_key = Column(String(64), nullable=False, unique=True, index=True)
    name = Column(String(128), nullable=False)
    wood = Column(String(16), nullable=False)
    trim = Column(String(16), nullable=False)
    swatch = Column(String(16), nullable=False)
    has_texture = Column(Boolean, nullable=False, default=False)
    texture_key = Column(String(64), nullable=True)
    sort_order = Column(Integer, nullable=False, default=0, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = Column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )


class Handle(Base):
    """One admin-managed door handle option.

    finish: "metallic" or "matte"
    door_kind: "hinged", "sliding", or "both"
    """

    __tablename__ = "handles"

    id = Column(Integer, primary_key=True)
    handle_key = Column(String(64), nullable=False, unique=True, index=True)
    name = Column(String(128), nullable=False)
    color = Column(String(16), nullable=False)
    finish = Column(String(16), nullable=False, default="matte")
    door_kind = Column(String(16), nullable=False, default="both", index=True)
    sort_order = Column(Integer, nullable=False, default=0, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = Column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )


class DoorTypeCover(Base):
    """Cover photo for each closet door type in the gallery picker.
    Two rows ever: kind="sliding" and kind="hinged".
    """

    __tablename__ = "door_type_covers"

    kind = Column(String(16), primary_key=True)
    image_path = Column(String(255), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )


class Asset(Base):
    """A named image stored in the upload directory; reusable in closet templates."""

    __tablename__ = "assets"

    id = Column(Integer, primary_key=True)
    name = Column(String(128), nullable=False)
    image_path = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)


class Logo(Base):
    """Admin-uploaded brand logos. Exactly one is active at a time."""

    __tablename__ = "logos"

    id = Column(Integer, primary_key=True)
    name = Column(String(128), nullable=False, default="")
    image_path = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(64), primary_key=True)
    value = Column(Text, nullable=False, default="")


class Lead(Base):
    """Cart-checkout lead. A visitor designs closets, adds to cart,
    then submits their contact info. Admin calls back to quote.

    status: "new" | "contacted" | "closed"
    """

    __tablename__ = "leads"

    id = Column(Integer, primary_key=True)
    name = Column(String(128), nullable=False)
    phone = Column(String(64), nullable=False, index=True)
    email = Column(String(128), nullable=True)
    address = Column(String(256), nullable=True)
    notes = Column(Text, nullable=True)
    cart_snapshot = Column(Text, nullable=False)
    status = Column(String(16), nullable=False, default="new", index=True)
    admin_notes = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=utcnow, index=True
    )
    updated_at = Column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )
    contacted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)
