import os

from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from auth import hash_password
from db import engine
from models import (
    Catalog, Handle, PaletteColor, Setting, User,
    GUEST_CUSTOMER_ID,
)


DEFAULT_SETTINGS = {
    "welcome_title": "ארונות בהתאמה אישית",
    "welcome_subtitle": "",
    "contact_phone": "",
    "contact_whatsapp": "",
    "whatsapp_message": "שלום! אני מעוניין/ת לשמוע יותר על ארונות Forma 👋",
    # Also surfaced by /api/public/settings (see PUBLIC_SETTING_KEYS); declared
    # here so every known setting key has a single documented default.
    "hero_tagline": "",
    "about_text": "",
    "default_closet_image": "",
    "trust_items": "",
    "landing_theme": "dark",
}

DEFAULT_PALETTE_COLORS = [
    {"color_key": "white",       "name": "לבן",       "wood": "#fafafa", "trim": "#c8c8c8", "swatch": "#fafafa", "has_texture": False},
    {"color_key": "cream",       "name": "שמנת",      "wood": "#f8eedb", "trim": "#d6c8a8", "swatch": "#f8eedb", "has_texture": False},
    {"color_key": "almond",      "name": "שקד",       "wood": "#e7d4b5", "trim": "#bfa987", "swatch": "#e7d4b5", "has_texture": False},
    {"color_key": "linen",       "name": "פשתן",      "wood": "#e2dcc7", "trim": "#bab18d", "swatch": "#e2dcc7", "has_texture": False},
    {"color_key": "concrete",    "name": "בטון",      "wood": "#dad7d0", "trim": "#9a978f", "swatch": "#dad7d0", "has_texture": False},
    {"color_key": "basalt",      "name": "בזלת",      "wood": "#4a4039", "trim": "#2c2521", "swatch": "#4a4039", "has_texture": False},
    {"color_key": "blackMarble", "name": "שיש שחור",  "wood": "#18181b", "trim": "#0a0a0c", "swatch": "#18181b", "has_texture": False},
    {"color_key": "whiteMarble", "name": "שיש לבן",   "wood": "#eae5dc", "trim": "#bcb6ab", "swatch": "#eae5dc", "has_texture": False},
    {"color_key": "sachlav",     "name": "סחלב",      "wood": "#e6cfae", "trim": "#bda881", "swatch": "#e6cfae", "has_texture": False},
    {"color_key": "mevuka",      "name": "מבוקע",     "wood": "#c4a373", "trim": "#a88458", "swatch": "#c4a373", "has_texture": True, "texture_key": "wood-mevuka"},
]

DEFAULT_HANDLES = [
    {"handle_key": "silver", "name": "כסוף", "color": "#bcc4ca", "finish": "metallic", "door_kind": "both"},
    {"handle_key": "white",  "name": "לבן",  "color": "#f0f0f0", "finish": "matte",    "door_kind": "both"},
    {"handle_key": "black",  "name": "שחור", "color": "#1a1a1a", "finish": "matte",    "door_kind": "both"},
]


def run_migrations(_db: Session) -> None:
    """Idempotent ALTER TABLE migrations for columns added after initial deploy.

    Uses the engine directly (SQLAlchemy 2 compatible — Session.get_bind()
    was removed in 2.0).
    """
    insp = inspect(engine)
    is_pg = engine.dialect.name == "postgresql"

    def _has_col(table: str, col: str) -> bool:
        try:
            return any(c["name"] == col for c in insp.get_columns(table))
        except Exception:
            return False

    def _add_col(table: str, col: str, col_type: str, default: str) -> None:
        if _has_col(table, col):
            return
        with engine.begin() as conn:
            if is_pg:
                conn.execute(text(
                    f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {col_type} DEFAULT {default}"
                ))
            else:
                conn.execute(text(
                    f"ALTER TABLE {table} ADD COLUMN {col} {col_type} DEFAULT {default}"
                ))

    # New User columns
    _add_col("users", "phone", "VARCHAR(32)", "NULL")
    _add_col("users", "deleted_at", "TIMESTAMP WITH TIME ZONE" if is_pg else "DATETIME", "NULL")
    _add_col("users", "cash_discount_enabled", "BOOLEAN", "FALSE")
    _add_col("users", "cash_discount_percent", "NUMERIC(5,2)", "4")
    _add_col("users", "buy_now_discount_enabled", "BOOLEAN", "FALSE")
    _add_col("users", "buy_now_discount_percent", "NUMERIC(5,2)", "6")
    _add_col("users", "token_version", "INTEGER", "0")

    # media_files — name and tags added in v0.63.0
    _add_col("media_files", "display_name", "VARCHAR(255)", "NULL")
    _add_col("media_files", "tags", "TEXT", "NULL")

    # component_prices — item_type added to map component to closet palette slot
    _add_col("component_prices", "item_type", "VARCHAR(20)", "NULL")
    _add_col("component_prices", "color", "VARCHAR(16)", "NULL")
    _add_col("component_prices", "min_per_cabin", "INTEGER", "0")
    _add_col("component_prices", "max_per_cabin", "INTEGER", "0")


def seed_admin(db: Session) -> None:
    customer_id = os.environ.get("ADMIN_CUSTOMER_ID", "admin").strip()
    password = os.environ.get("ADMIN_PASSWORD", "").strip()
    display_name = os.environ.get("ADMIN_DISPLAY_NAME", "Administrator").strip()

    if not password:
        raise RuntimeError(
            "ADMIN_PASSWORD must be set in .env — refusing to boot without it."
        )

    existing = db.query(User).filter(User.customer_id == customer_id).one_or_none()
    new_hash = hash_password(password)
    if existing:
        existing.password_hash = new_hash
        existing.is_admin = True
        if display_name:
            existing.display_name = display_name
        db.commit()
        return

    db.add(User(
        customer_id=customer_id,
        display_name=display_name or customer_id,
        password_hash=new_hash,
        is_admin=True,
    ))
    db.commit()


def seed_guest_user(db: Session) -> None:
    """Ensure the sentinel guest account exists. Used by the public contact form."""
    existing = db.query(User).filter(User.customer_id == GUEST_CUSTOMER_ID).one_or_none()
    if existing:
        return
    import secrets
    db.add(User(
        customer_id=GUEST_CUSTOMER_ID,
        display_name="אורח",
        password_hash=hash_password(secrets.token_hex(32)),
        is_admin=False,
    ))
    db.commit()


def seed_default_catalog(db: Session) -> None:
    """Ensure at least one active catalog exists for customer portal use."""
    if db.query(Catalog).filter(Catalog.is_active.is_(True)).first():
        return
    if db.query(Catalog).first():
        return
    db.add(Catalog(name="קטלוג ראשי", is_active=True))
    db.commit()


def seed_settings(db: Session) -> None:
    for key, value in DEFAULT_SETTINGS.items():
        existing = db.query(Setting).filter(Setting.key == key).one_or_none()
        if not existing:
            db.add(Setting(key=key, value=value))
    db.commit()


def seed_palette_colors(db: Session) -> None:
    if db.query(PaletteColor).first() is not None:
        return
    for i, entry in enumerate(DEFAULT_PALETTE_COLORS):
        db.add(PaletteColor(
            color_key=entry["color_key"],
            name=entry["name"],
            wood=entry["wood"],
            trim=entry["trim"],
            swatch=entry["swatch"],
            has_texture=entry["has_texture"],
            texture_key=entry.get("texture_key"),
            sort_order=i,
        ))
    db.commit()


def seed_handles(db: Session) -> None:
    if db.query(Handle).first() is not None:
        return
    for i, entry in enumerate(DEFAULT_HANDLES):
        db.add(Handle(
            handle_key=entry["handle_key"],
            name=entry["name"],
            color=entry["color"],
            finish=entry["finish"],
            door_kind=entry["door_kind"],
            sort_order=i,
        ))
    db.commit()
