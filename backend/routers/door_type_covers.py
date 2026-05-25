from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from auth import require_admin
from db import get_db
from helpers import delete_upload, save_upload
from models import DoorTypeCover
from schemas import DoorTypeCoverOut

router = APIRouter(dependencies=[Depends(require_admin)])

VALID_KINDS = {"hinged", "sliding"}


@router.get("", response_model=List[DoorTypeCoverOut])
def list_covers(db: Session = Depends(get_db)):
    rows = db.query(DoorTypeCover).all()
    return [DoorTypeCoverOut.model_validate(r) for r in rows]


@router.post("/{kind}/image", response_model=DoorTypeCoverOut)
def upload_cover(
    kind: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if kind not in VALID_KINDS:
        raise HTTPException(status_code=422, detail=f"kind חייב להיות: {', '.join(sorted(VALID_KINDS))}")
    filename = save_upload(file)
    row = db.get(DoorTypeCover, kind)
    if row:
        old_path = row.image_path
        row.image_path = filename
        db.commit()
        db.refresh(row)
        delete_upload(old_path)
    else:
        row = DoorTypeCover(kind=kind, image_path=filename)
        db.add(row)
        db.commit()
        db.refresh(row)
    return DoorTypeCoverOut.model_validate(row)


@router.delete("/{kind}/image", status_code=204)
def delete_cover(kind: str, db: Session = Depends(get_db)):
    if kind not in VALID_KINDS:
        raise HTTPException(status_code=422, detail=f"kind חייב להיות: {', '.join(sorted(VALID_KINDS))}")
    row = db.get(DoorTypeCover, kind)
    if row is None:
        return
    old_path = row.image_path
    db.delete(row)
    db.commit()
    delete_upload(old_path)
