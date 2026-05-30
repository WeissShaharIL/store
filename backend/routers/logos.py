from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from auth import require_admin
from db import get_db
from helpers import register_media, save_upload, unregister_media
from models import Logo
from schemas import LogoOut

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("", response_model=List[LogoOut])
def list_logos(db: Session = Depends(get_db)):
    rows = db.query(Logo).order_by(Logo.created_at.desc()).all()
    return [LogoOut.model_validate(r) for r in rows]


@router.post("", response_model=LogoOut, status_code=201)
def upload_logo(
    name: str = Form(default=""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    filename = save_upload(file)
    register_media(db, filename, file.filename)
    row = Logo(name=(name or "").strip(), image_path=filename, is_active=False)
    db.add(row)
    db.commit()
    db.refresh(row)
    return LogoOut.model_validate(row)


@router.post("/{logo_id}/activate", response_model=LogoOut)
def activate_logo(logo_id: int, db: Session = Depends(get_db)):
    row = db.get(Logo, logo_id)
    if row is None:
        raise HTTPException(status_code=404, detail="לוגו לא נמצא")
    db.query(Logo).filter(Logo.id != logo_id).update({"is_active": False})
    row.is_active = True
    db.commit()
    db.refresh(row)
    return LogoOut.model_validate(row)


@router.delete("/{logo_id}", status_code=204)
def delete_logo(logo_id: int, db: Session = Depends(get_db)):
    row = db.get(Logo, logo_id)
    if row is None:
        return
    if row.is_active:
        raise HTTPException(status_code=409, detail="לא ניתן למחוק לוגו פעיל. הפעל לוגו אחר תחילה.")
    old_path = row.image_path
    db.delete(row)
    db.commit()
    unregister_media(db, old_path)
    db.commit()
