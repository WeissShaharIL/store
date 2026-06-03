"""Admin config for the customer-facing custom closet designer.

All settings are stored as a single JSON blob under the key
`custom_closet_config` in the settings table. A public read-only
endpoint lets the frontend load the config without auth.
"""
import json
from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import require_admin
from db import get_db
from models import Setting

SETTING_KEY = "custom_closet_config"

DEFAULT_CONFIG: Dict[str, Any] = {
    "minDoors": 1,
    "maxDoors": 6,
    "compartmentWidth": {"min": 40, "max": 120, "step": 5, "default": 60},
    "height":           {"min": 150, "max": 280, "step": 5, "default": 220},
    "depth":            {"min": 40,  "max": 80,  "step": 5, "default": 60},
    "allowDivider": True,
    "allowHinged":  True,
    "allowSliding": True,
    "minShelvesPerCabin": 2,
}

router = APIRouter()
public_router = APIRouter()


def _load(db: Session) -> Dict[str, Any]:
    row = db.query(Setting).filter(Setting.key == SETTING_KEY).one_or_none()
    if not row:
        return dict(DEFAULT_CONFIG)
    try:
        return json.loads(row.value)
    except Exception:
        return dict(DEFAULT_CONFIG)


def _save(db: Session, data: Dict[str, Any]) -> None:
    row = db.query(Setting).filter(Setting.key == SETTING_KEY).one_or_none()
    serialized = json.dumps(data, ensure_ascii=False)
    if row:
        row.value = serialized
    else:
        db.add(Setting(key=SETTING_KEY, value=serialized))
    db.commit()


# ── Admin routes (require_admin) ──────────────────────────────────────────────

@router.get("", dependencies=[Depends(require_admin)])
def get_config(db: Session = Depends(get_db)):
    return _load(db)


@router.patch("", dependencies=[Depends(require_admin)])
def update_config(payload: Dict[str, Any], db: Session = Depends(get_db)):
    existing = _load(db)
    merged = {**existing, **payload}
    _save(db, merged)
    return merged


# ── Public route (no auth) ────────────────────────────────────────────────────

@public_router.get("")
def get_config_public(db: Session = Depends(get_db)):
    return _load(db)
