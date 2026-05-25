from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from auth import require_admin
from db import get_db
from helpers import delete_upload, save_upload
from models import Asset
from schemas import AssetOut

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("", response_model=List[AssetOut])
def list_assets(db: Session = Depends(get_db)):
    rows = db.query(Asset).order_by(Asset.created_at.desc()).all()
    return [AssetOut.model_validate(r) for r in rows]


@router.post("", response_model=AssetOut, status_code=201)
def upload_asset(
    name: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    filename = save_upload(file)
    row = Asset(name=name.strip(), image_path=filename)
    db.add(row)
    db.commit()
    db.refresh(row)
    return AssetOut.model_validate(row)


@router.delete("/{asset_id}", status_code=204)
def delete_asset(asset_id: int, db: Session = Depends(get_db)):
    row = db.get(Asset, asset_id)
    if row is None:
        return
    old_path = row.image_path
    db.delete(row)
    db.commit()
    delete_upload(old_path)
