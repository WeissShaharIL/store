from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from auth import require_admin
from db import get_db
from helpers import delete_upload, save_upload
from models import HeroBanner, MediaFile
from schemas import HeroBannerOut

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("", response_model=List[HeroBannerOut])
def list_banners(db: Session = Depends(get_db)):
    rows = db.query(HeroBanner).order_by(HeroBanner.sort_order, HeroBanner.created_at).all()
    return [HeroBannerOut.model_validate(r) for r in rows]


@router.post("", response_model=HeroBannerOut, status_code=201)
def upload_banner(file: UploadFile = File(...), db: Session = Depends(get_db)):
    filename = save_upload(file)
    db.add(MediaFile(folder_id=None, image_path=filename, original_name=file.filename))
    max_order = db.query(HeroBanner).count()
    row = HeroBanner(image_path=filename, sort_order=max_order)
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
    delete_upload(old_path)
