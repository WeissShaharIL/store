from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from auth import require_admin
from db import get_db
from sqlalchemy import func

from helpers import register_media, save_upload, unregister_media
from models import HeroBanner
from schemas import HeroBannerOut

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("", response_model=List[HeroBannerOut])
def list_banners(db: Session = Depends(get_db)):
    rows = db.query(HeroBanner).order_by(HeroBanner.sort_order, HeroBanner.created_at).all()
    return [HeroBannerOut.model_validate(r) for r in rows]


@router.post("", response_model=HeroBannerOut, status_code=201)
def upload_banner(file: UploadFile = File(...), db: Session = Depends(get_db)):
    filename = save_upload(file)
    register_media(db, filename, file.filename)
    next_order = (db.query(func.coalesce(func.max(HeroBanner.sort_order), -1)).scalar() or -1) + 1
    row = HeroBanner(image_path=filename, sort_order=next_order)
    db.add(row)
    db.commit()
    db.refresh(row)
    return HeroBannerOut.model_validate(row)


@router.delete("/{banner_id}", status_code=204)
def delete_banner(banner_id: int, db: Session = Depends(get_db)):
    row = db.get(HeroBanner, banner_id)
    if row is None:
        raise HTTPException(status_code=404, detail="באנר לא נמצא")
    old_path = row.image_path
    db.delete(row)
    db.commit()
    unregister_media(db, old_path)
    db.commit()
