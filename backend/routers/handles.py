from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import require_admin
from db import get_db
from models import ClosetTemplate, Handle
from schemas import HandleCreate, HandleOut, HandleUpdate

router = APIRouter(dependencies=[Depends(require_admin)])

VALID_FINISHES = {"metallic", "matte"}
VALID_DOOR_KINDS = {"hinged", "sliding", "both"}


def _to_out(row: Handle) -> HandleOut:
    return HandleOut(
        id=row.id,
        handle_key=row.handle_key,
        name=row.name,
        color=row.color,
        finish=row.finish,
        door_kind=row.door_kind,
        sort_order=row.sort_order,
        updated_at=row.updated_at,
    )


@router.get("", response_model=List[HandleOut])
def list_handles(db: Session = Depends(get_db)):
    rows = db.query(Handle).order_by(Handle.sort_order, Handle.id).all()
    return [_to_out(r) for r in rows]


@router.post("", response_model=HandleOut, status_code=201)
def create_handle(payload: HandleCreate, db: Session = Depends(get_db)):
    if payload.finish not in VALID_FINISHES:
        raise HTTPException(status_code=422, detail=f"finish חייב להיות: {', '.join(sorted(VALID_FINISHES))}")
    if payload.door_kind not in VALID_DOOR_KINDS:
        raise HTTPException(status_code=422, detail=f"door_kind חייב להיות: {', '.join(sorted(VALID_DOOR_KINDS))}")
    existing = db.query(Handle).filter(Handle.handle_key == payload.handle_key).one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail=f"מפתח ידית '{payload.handle_key}' כבר קיים")
    row = Handle(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.patch("/{handle_id}", response_model=HandleOut)
def update_handle(handle_id: int, payload: HandleUpdate, db: Session = Depends(get_db)):
    row = db.get(Handle, handle_id)
    if row is None:
        raise HTTPException(status_code=404, detail="ידית לא נמצאה")
    data = payload.model_dump(exclude_unset=True)
    if "finish" in data and data["finish"] not in VALID_FINISHES:
        raise HTTPException(status_code=422, detail=f"finish חייב להיות: {', '.join(sorted(VALID_FINISHES))}")
    if "door_kind" in data and data["door_kind"] not in VALID_DOOR_KINDS:
        raise HTTPException(status_code=422, detail=f"door_kind חייב להיות: {', '.join(sorted(VALID_DOOR_KINDS))}")
    for key, value in data.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.delete("/{handle_id}", status_code=204)
def delete_handle(handle_id: int, db: Session = Depends(get_db)):
    row = db.get(Handle, handle_id)
    if row is None:
        return
    count = (
        db.query(ClosetTemplate)
        .filter(ClosetTemplate.config_json.contains(f'"handleColor":"{row.handle_key}"'))
        .count()
    )
    if count:
        raise HTTPException(
            status_code=409,
            detail=f"לא ניתן למחוק — {count} תבניות משתמשות בידית זו",
        )
    db.delete(row)
    db.commit()
