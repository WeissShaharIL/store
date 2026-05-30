import json
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from auth import require_admin
from db import get_db
from helpers import delete_upload, save_upload
from models import ClosetTemplate, MediaFile
from schemas import ClosetTemplateCreate, ClosetTemplateOut, ClosetTemplateUpdate

router = APIRouter(dependencies=[Depends(require_admin)])


def _to_out(row: ClosetTemplate) -> ClosetTemplateOut:
    return ClosetTemplateOut(
        id=row.id,
        name=row.name,
        config_json=row.config_json,
        is_ready=row.is_ready,
        image_path=row.image_path,
        is_display_sale=row.is_display_sale,
        display_sale_price=row.display_sale_price,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("", response_model=List[ClosetTemplateOut])
def list_templates(db: Session = Depends(get_db)):
    rows = db.query(ClosetTemplate).order_by(ClosetTemplate.updated_at.desc()).all()
    return [_to_out(r) for r in rows]


@router.post("", response_model=ClosetTemplateOut, status_code=201)
def create_template(payload: ClosetTemplateCreate, db: Session = Depends(get_db)):
    row = ClosetTemplate(name=payload.name.strip(), config_json=payload.config_json)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.get("/{template_id}", response_model=ClosetTemplateOut)
def get_template(template_id: int, db: Session = Depends(get_db)):
    row = db.get(ClosetTemplate, template_id)
    if row is None:
        raise HTTPException(status_code=404, detail="תבנית לא נמצאה")
    return _to_out(row)


@router.patch("/{template_id}", response_model=ClosetTemplateOut)
def update_template(
    template_id: int, payload: ClosetTemplateUpdate, db: Session = Depends(get_db)
):
    row = db.get(ClosetTemplate, template_id)
    if row is None:
        raise HTTPException(status_code=404, detail="תבנית לא נמצאה")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.post("/{template_id}/image", response_model=ClosetTemplateOut)
def upload_template_image(
    template_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    row = db.get(ClosetTemplate, template_id)
    if row is None:
        raise HTTPException(status_code=404, detail="תבנית לא נמצאה")
    old_path = row.image_path
    row.image_path = save_upload(file)
    db.add(MediaFile(folder_id=None, image_path=row.image_path, original_name=file.filename))
    db.commit()
    db.refresh(row)
    delete_upload(old_path)
    return _to_out(row)


@router.delete("/{template_id}/image", response_model=ClosetTemplateOut)
def delete_template_image(template_id: int, db: Session = Depends(get_db)):
    row = db.get(ClosetTemplate, template_id)
    if row is None:
        raise HTTPException(status_code=404, detail="תבנית לא נמצאה")
    old_path = row.image_path
    row.image_path = None
    db.commit()
    db.refresh(row)
    delete_upload(old_path)
    return _to_out(row)


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: int, db: Session = Depends(get_db)):
    row = db.get(ClosetTemplate, template_id)
    if row is None:
        return
    old_path = row.image_path
    db.delete(row)
    db.commit()
    delete_upload(old_path)
