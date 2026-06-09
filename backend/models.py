from datetime import datetime, timezone
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, Numeric,
    String, Table, Text, UniqueConstraint,
)
from sqlalchemy.orm import relationship

from db import Base


def utcnow():
    return datetime.now(timezone.utc)


# Sentinel customer_id for the shared guest account used by the public
# contact form.
GUEST_CUSTOMER_ID = "__guest__"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    customer_id = Column(String(64), unique=True, nullable=False, index=True)
    display_name = Column(String(128), nullable=False, default="")
    password_hash = Column(String(255), nullable=False)
    phone = Column(String(32), nullable=True)
    is_admin = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)

    # Per-customer discount toggles + percentages
    cash_discount_enabled = Column(Boolean, nullable=False, default=False)
    cash_discount_percent = Column(Numeric(5, 2), nullable=False, default=4)
    buy_now_discount_enabled = Column(Boolean, nullable=False, default=False)
    buy_now_discount_percent = Column(Numeric(5, 2), nullable=False, default=6)

    customer_items = relationship(
        "CustomerItem", back_populates="user", cascade="all, delete-orphan"
    )


# Many-to-many: a product (Item) can belong to multiple catalogs.
catalog_items_membership = Table(
    "catalog_items_membership",
    Base.metadata,
    Column(
        "catalog_id",
        Integer,
        ForeignKey("catalogs.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "item_id",
        Integer,
        ForeignKey("items.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Catalog(Base):
    __tablename__ = "catalogs"

    id = Column(Integer, primary_key=True)
    name = Column(String(128), nullable=False)
    is_active = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    items = relationship(
        "Item",
        secondary=catalog_items_membership,
        back_populates="catalogs",
    )


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True)
    product_code = Column(String(64), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(64), nullable=False, default="כללי")
    base_price = Column(Numeric(10, 2), nullable=False, default=0)
    image_path = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    catalogs = relationship(
        "Catalog",
        secondary=catalog_items_membership,
        back_populates="items",
    )
    customer_items = relationship(
        "CustomerItem", back_populates="item", cascade="all, delete-orphan"
    )


class CustomerItem(Base):
    """Per-customer price override and hidden flag for a catalog item."""
    __tablename__ = "customer_items"
    __table_args__ = (UniqueConstraint("user_id", "item_id", name="uq_customer_item"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=False, index=True)
    price_override = Column(Numeric(10, 2), nullable=True)
    hidden = Column(Boolean, nullable=False, default=False)

    user = relationship("User", back_populates="customer_items")
    item = relationship("Item", back_populates="customer_items")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=utcnow, index=True
    )
    delivered_at = Column(DateTime(timezone=True), nullable=True, index=True)
    notes = Column(Text, nullable=True)
    total_amount = Column(Numeric(10, 2), nullable=False, default=0)

    user = relationship("User")
    lines = relationship(
        "OrderLine", back_populates="order", cascade="all, delete-orphan"
    )


class OrderLine(Base):
    __tablename__ = "order_lines"

    id = Column(Integer, primary_key=True)
    order_id = Column(
        Integer, ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    item_id = Column(
        Integer, ForeignKey("items.id", ondelete="SET NULL"),
        nullable=True,
    )
    product_code = Column(String(64), nullable=False)  # snapshot
    name = Column(String(255), nullable=False)          # snapshot
    unit_price = Column(Numeric(10, 2), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)

    order = relationship("Order", back_populates="lines")
    item = relationship("Item")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True)
    sender_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    recipient_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    body = Column(Text, nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=utcnow, index=True
    )


class Announcement(Base):
    """Broadcast message the admin sends to all customers. Blocks the app
    until each customer clicks Accept (recorded in AnnouncementAck)."""
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True)
    body = Column(Text, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(
        DateTime(timezone=True), nullable=False, default=utcnow, index=True
    )

    acks = relationship(
        "AnnouncementAck",
        back_populates="announcement",
        cascade="all, delete-orphan",
    )


class AnnouncementAck(Base):
    __tablename__ = "announcement_acks"

    announcement_id = Column(
        Integer,
        ForeignKey("announcements.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    acked_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    announcement = relationship("Announcement", back_populates="acks")


class ClosetTemplate(Base):
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
    __tablename__ = "door_type_covers"

    kind = Column(String(16), primary_key=True)
    image_path = Column(String(255), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True)
    name = Column(String(128), nullable=False)
    image_path = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)


class Logo(Base):
    __tablename__ = "logos"

    id = Column(Integer, primary_key=True)
    name = Column(String(128), nullable=False, default="")
    image_path = Column(String(255), nullable=False)
    is_active = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)


class HeroBanner(Base):
    __tablename__ = "hero_banners"

    id = Column(Integer, primary_key=True)
    image_path = Column(String(255), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(64), primary_key=True)
    value = Column(Text, nullable=False, default="")


class Lead(Base):
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


class ClosetOrder(Base):
    """A confirmed order an admin created from a customer lead.

    Carries a snapshot of the customer's contact details and the designed
    cart (same JSON shape as Lead.cart_snapshot) so the order is self-
    contained even if the source lead is later edited or deleted.
    """
    __tablename__ = "closet_orders"

    id = Column(Integer, primary_key=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True, index=True)
    customer_name = Column(String(128), nullable=False)
    phone = Column(String(64), nullable=False, index=True)
    email = Column(String(128), nullable=True)
    address = Column(String(256), nullable=True)
    cart_snapshot = Column(Text, nullable=False, default="[]")
    total_amount = Column(Numeric(10, 2), nullable=True)
    status = Column(String(24), nullable=False, default="new", index=True)
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow, index=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)


class ActivityEvent(Base):
    __tablename__ = "activity_events"

    id = Column(Integer, primary_key=True)
    action = Column(String(64), nullable=False, index=True)
    actor = Column(String(128), nullable=True)
    ip = Column(String(64), nullable=True)
    details = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow, index=True)


class MediaFolder(Base):
    __tablename__ = "media_folders"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)


class MediaFile(Base):
    __tablename__ = "media_files"

    id = Column(Integer, primary_key=True)
    folder_id = Column(Integer, ForeignKey("media_folders.id"), nullable=True, index=True)
    image_path = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=True)
    display_name = Column(String(255), nullable=True)   # admin-given name
    tags = Column(Text, nullable=True)                  # comma-separated tags
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow, index=True)


class ComponentPrice(Base):
    __tablename__ = "component_prices"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    sku = Column(String(64), nullable=False, default="")
    # "fixed" | "width" | "height" | "depth"
    price_basis = Column(String(20), nullable=False, default="fixed")
    # "shelf" | "rod" | "drawer" | null — maps this component to a closet interior slot
    item_type = Column(String(20), nullable=True)
    # hex color shown in the stage-2 interior plan (e.g. "#a98865")
    color = Column(String(16), nullable=True)
    # minimum number of this item required in each cabin (0 = no minimum)
    min_per_cabin = Column(Integer, nullable=False, default=0)
    # maximum number of this item allowed in each cabin (0 = unlimited)
    max_per_cabin = Column(Integer, nullable=False, default=0)
    # fixed → '{"price": 150}'
    # dimension → '[{"from": 0, "to": 80, "price": 100}, {"from": 81, "to": null, "price": 150}]'
    rules = Column(Text, nullable=False, default="{}")
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)
