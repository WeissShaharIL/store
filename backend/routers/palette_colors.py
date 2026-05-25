from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import require_admin
from db import get_db
from models import ClosetTemplate, PaletteColor
from schemas import PaletteColorCreate, PaletteColorOut, PaletteColorUpdate

router = APIRouter(dependencies=[Depends(require_admin)])


def _to_out(row: PaletteColor) -> PaletteColorOut:
    return PaletteColorOut(
        id=row.id,
        color_key=row.color_key,
        name=row.name,
        wood=row.wood,
        trim=row.trim,
        swatch=row.swatch,
        has_texture=row.has_texture,
        texture_key=row.texture_key,
        sort_order=row.sort_order,
        updated_at=row.updated_at,
    )


@router.get("", response_model=List[PaletteColorOut])
def list_colors(db: Session = Depends(get_db)):
    rows = db.query(PaletteColor).order_by(PaletteColor.sort_order, PaletteColor.id).all()
    return [_to_out(r) for r in rows]


@router.post("", response_model=PaletteColorOut, status_code=201)
def create_color(payload: PaletteColorCreate, db: Session = Depends(get_db)):
    existing = db.query(PaletteColor).filter(PaletteColor.color_key == payload.color_key).one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail=f"מפתח צבע '{payload.color_key}' כבר קיים")
    row = PaletteColor(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.patch("/{color_id}", response_model=PaletteColorOut)
def update_color(color_id: int, payload: PaletteColorUpdate, db: Session = Depends(get_db)):
    row = db.get(PaletteColor, color_id)
    if row is None:
        raise HTTPException(status_code=404, detail="צבע לא נמצא")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.delete("/{color_id}", status_code=204)
def delete_color(color_id: int, db: Session = Depends(get_db)):
    row = db.get(PaletteColor, color_id)
    if row is None:
        return
    # Refuse if any closet template references this key
    count = (
        db.query(ClosetTemplate)
        .filter(ClosetTemplate.config_json.contains(f'"color":"{row.color_key}"'))
        .count()
    )
    if count:
        raise HTTPException(
            status_code=409,
            detail=f"לא ניתן למחוק — {count} תבניות משתמשות בצבע זה",
        )
    db.delete(row)
    db.commit()
