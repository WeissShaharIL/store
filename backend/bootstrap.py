import os

from sqlalchemy.orm import Session

from auth import hash_password
from models import Handle, PaletteColor, Setting, User


DEFAULT_SETTINGS = {
    "welcome_title": "ארונות בהתאמה אישית",
    "welcome_subtitle": "",
    "contact_phone": "",
    "contact_whatsapp": "",
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
