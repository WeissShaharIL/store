from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    customer_id: str
    password: str


class LoginResponse(BaseModel):
    id: int
    customer_id: str
    display_name: str
    is_admin: bool


class MeResponse(BaseModel):
    id: int
    customer_id: str
    display_name: str
    is_admin: bool
    phone: Optional[str] = None


class PasswordChange(BaseModel):
    old_password: str = Field(min_length=1)
    new_password: str = Field(min_length=1)


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(default=None, max_length=128)
    phone: Optional[str] = Field(default=None, max_length=32)


# ── Customer catalog ──────────────────────────────────────────────────────────

class CatalogItem(BaseModel):
    id: int
    product_code: str
    name: str
    description: Optional[str] = None
    category: str
    base_price: Decimal
    price: Decimal
    image_path: Optional[str] = None
    hidden: bool = False

    cash_discount_percent: Optional[Decimal] = None
    cash_discount_price: Optional[Decimal] = None
    buy_now_discount_percent: Optional[Decimal] = None
    buy_now_discount_price: Optional[Decimal] = None


# ── Messages ──────────────────────────────────────────────────────────────────

class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sender_id: int
    recipient_id: int
    body: str
    read_at: Optional[datetime] = None
    created_at: datetime


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


# ── Orders ────────────────────────────────────────────────────────────────────

class OrderLineCreate(BaseModel):
    item_id: int
    quantity: int = Field(ge=1, le=10_000)


class OrderCreate(BaseModel):
    notes: Optional[str] = Field(default=None, max_length=2000)
    lines: List[OrderLineCreate] = Field(min_length=1, max_length=200)


class OrderLineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: Optional[int] = None
    product_code: str
    name: str
    unit_price: Decimal
    quantity: int


class OrderOut(BaseModel):
    id: int
    user_id: int
    customer_id: str
    display_name: str
    created_at: datetime
    delivered_at: Optional[datetime] = None
    notes: Optional[str] = None
    total_amount: Decimal
    lines: List[OrderLineOut]


# ── Announcements ─────────────────────────────────────────────────────────────

class AnnouncementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    body: str
    is_active: bool
    created_at: datetime


# ── Closet Templates ──────────────────────────────────────────────────────────

class ClosetTemplateCreate(BaseModel):
    name: str
    config_json: str


class ClosetTemplateUpdate(BaseModel):
    name: Optional[str] = None
    config_json: Optional[str] = None
    is_ready: Optional[bool] = None
    is_display_sale: Optional[bool] = None
    display_sale_price: Optional[str] = None


class ClosetTemplateOut(BaseModel):
    id: int
    name: str
    config_json: str
    is_ready: bool
    image_path: Optional[str]
    is_display_sale: bool
    display_sale_price: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Palette Colors ────────────────────────────────────────────────────────────

class PaletteColorCreate(BaseModel):
    color_key: str
    name: str
    wood: str
    trim: str
    swatch: str
    has_texture: bool = False
    texture_key: Optional[str] = None
    sort_order: int = 0


class PaletteColorUpdate(BaseModel):
    name: Optional[str] = None
    wood: Optional[str] = None
    trim: Optional[str] = None
    swatch: Optional[str] = None
    has_texture: Optional[bool] = None
    texture_key: Optional[str] = None
    sort_order: Optional[int] = None


class PaletteColorOut(BaseModel):
    id: int
    color_key: str
    name: str
    wood: str
    trim: str
    swatch: str
    has_texture: bool
    texture_key: Optional[str]
    sort_order: int
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Handles ───────────────────────────────────────────────────────────────────

class HandleCreate(BaseModel):
    handle_key: str
    name: str
    color: str
    finish: str = "matte"
    door_kind: str = "both"
    sort_order: int = 0


class HandleUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    finish: Optional[str] = None
    door_kind: Optional[str] = None
    sort_order: Optional[int] = None


class HandleOut(BaseModel):
    id: int
    handle_key: str
    name: str
    color: str
    finish: str
    door_kind: str
    sort_order: int
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Assets ────────────────────────────────────────────────────────────────────

class AssetOut(BaseModel):
    id: int
    name: str
    image_path: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Logos ─────────────────────────────────────────────────────────────────────

class LogoOut(BaseModel):
    id: int
    name: str
    image_path: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class HeroBannerOut(BaseModel):
    id: int
    image_path: str
    sort_order: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Settings ──────────────────────────────────────────────────────────────────

class SettingsUpdate(BaseModel):
    values: Dict[str, str]


# ── Door Type Covers ──────────────────────────────────────────────────────────

class DoorTypeCoverOut(BaseModel):
    kind: str
    image_path: str
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Leads ─────────────────────────────────────────────────────────────────────

class CartItemOut(BaseModel):
    id: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    display_sale_id: Optional[int] = None

    class Config:
        extra = "allow"


class LeadCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    cart: List[CartItemOut] = []


class LeadUpdate(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None


class LeadOut(BaseModel):
    id: int
    name: str
    phone: str
    email: Optional[str]
    address: Optional[str]
    notes: Optional[str]
    cart: List[Any]
    status: str
    admin_notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    contacted_at: Optional[datetime]
    deleted_at: Optional[datetime]

    class Config:
        from_attributes = True
