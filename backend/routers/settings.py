from typing import Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import require_admin
from db import get_db
from models import Setting
from schemas import SettingsUpdate

router = APIRouter()


@router.get("")
def get_settings(db: Session = Depends(get_db)) -> Dict[str, str]:
    rows = db.query(Setting).all()
    return {r.key: r.value for r in rows}


@router.patch("", dependencies=[Depends(require_admin)])
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)) -> Dict[str, str]:
    for key, value in payload.values.items():
        row = db.query(Setting).filter(Setting.key == key).one_or_none()
        if row:
            row.value = value
        else:
            db.add(Setting(key=key, value=value))
    db.commit()
    rows = db.query(Setting).all()
    return {r.key: r.value for r in rows}
