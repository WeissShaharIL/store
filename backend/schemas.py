from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    customer_id: str
    password: str


class LoginResponse(BaseModel):
    id: int
    customer_id: str
    display_name: str
    is_admin: bool


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
