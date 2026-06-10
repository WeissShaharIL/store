import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel, ConfigDict  # noqa: F401 (ConfigDict used in schemas below)
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import require_admin
from db import get_db
from helpers import delete_upload, save_upload
from models import MediaFile, MediaFolder

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(require_admin)])

DEFAULT_PAGE = 500
MAX_PAGE = 1000


# ── Schemas ───────────────────────────────────────────────────────────────────

class FolderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    file_count: int


class FileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    folder_id: Optional[int]
    image_path: str
    original_name: Optional[str]
    display_name: Optional[str]
    tags: Optional[str]


class FileUpdatePayload(BaseModel):
    display_name: Optional[str] = None
    tags: Optional[str] = None


# ── Folders ───────────────────────────────────────────────────────────────────

@router.get("/folders", response_model=List[FolderOut])
def list_folders(db: Session = Depends(get_db)):
    folders = db.query(MediaFolder).order_by(MediaFolder.name).all()
    # One grouped query for all folder counts instead of a COUNT per folder.
    counts = dict(
        db.query(MediaFile.folder_id, func.count(MediaFile.id))
        .group_by(MediaFile.folder_id)
        .all()
    )
    return [
        FolderOut(id=f.id, name=f.name, file_count=counts.get(f.id, 0))
        for f in folders
    ]


@router.post("/folders", response_model=FolderOut, status_code=201)
def create_folder(name: str = Form(...), db: Session = Depends(get_db)):
    name = name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="שם התיקייה לא יכול להיות ריק")
    row = MediaFolder(name=name)
    db.add(row)
    db.commit()
    db.refresh(row)
    return FolderOut(id=row.id, name=row.name, file_count=0)


@router.patch("/folders/{folder_id}", response_model=FolderOut)
def rename_folder(folder_id: int, name: str = Form(...), db: Session = Depends(get_db)):
    name = name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="שם התיקייה לא יכול להיות ריק")
    folder = db.get(MediaFolder, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="תיקייה לא נמצאה")
    folder.name = name
    db.commit()
    count = db.query(MediaFile).filter(MediaFile.folder_id == folder_id).count()
    return FolderOut(id=folder.id, name=folder.name, file_count=count)


@router.delete("/folders/{folder_id}", status_code=204)
def delete_folder(folder_id: int, db: Session = Depends(get_db)):
    folder = db.get(MediaFolder, folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="תיקייה לא נמצאה")
    # Move files to unassigned rather than deleting them
    db.query(MediaFile).filter(MediaFile.folder_id == folder_id).update({"folder_id": None})
    db.delete(folder)
    db.commit()


# ── Files ─────────────────────────────────────────────────────────────────────

@router.get("/files", response_model=List[FileOut])
def list_files(
    folder_id: Optional[int] = None,
    no_folder: bool = False,
    limit: int = Query(default=DEFAULT_PAGE, ge=1, le=MAX_PAGE),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    q = db.query(MediaFile)
    if no_folder:
        q = q.filter(MediaFile.folder_id.is_(None))
    elif folder_id is not None:
        q = q.filter(MediaFile.folder_id == folder_id)
    rows = q.order_by(MediaFile.created_at.desc()).limit(limit).offset(offset).all()
    if len(rows) == limit:
        logger.warning("list_files hit the page limit (%s); results may be truncated", limit)
    return rows


@router.post("/files", response_model=FileOut, status_code=201)
def upload_file(
    folder_id: Optional[int] = Form(default=None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if folder_id is not None and not db.get(MediaFolder, folder_id):
        raise HTTPException(status_code=404, detail="תיקייה לא נמצאה")
    filename = save_upload(file)
    row = MediaFile(folder_id=folder_id, image_path=filename, original_name=file.filename)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


class MoveFilePayload(BaseModel):
    folder_id: Optional[int] = None


@router.patch("/files/{file_id}", response_model=FileOut)
def move_file(file_id: int, payload: MoveFilePayload, db: Session = Depends(get_db)):
    row = db.get(MediaFile, file_id)
    if not row:
        raise HTTPException(status_code=404, detail="קובץ לא נמצא")
    if payload.folder_id is not None and not db.get(MediaFolder, payload.folder_id):
        raise HTTPException(status_code=404, detail="תיקייה לא נמצאה")
    row.folder_id = payload.folder_id
    db.commit()
    db.refresh(row)
    return row


@router.put("/files/{file_id}/details", response_model=FileOut)
def update_file_details(file_id: int, payload: FileUpdatePayload, db: Session = Depends(get_db)):
    row = db.get(MediaFile, file_id)
    if not row:
        raise HTTPException(status_code=404, detail="קובץ לא נמצא")
    if payload.display_name is not None:
        row.display_name = payload.display_name.strip() or None
    if payload.tags is not None:
        # Normalise: lowercase, strip whitespace, deduplicate, store comma-separated
        raw = [t.strip().lower() for t in payload.tags.split(",") if t.strip()]
        row.tags = ",".join(dict.fromkeys(raw)) or None
    db.commit()
    db.refresh(row)
    return row


@router.delete("/files/{file_id}", status_code=204)
def delete_file(file_id: int, db: Session = Depends(get_db)):
    row = db.get(MediaFile, file_id)
    if not row:
        raise HTTPException(status_code=404, detail="קובץ לא נמצא")
    path = row.image_path
    db.delete(row)
    db.commit()
    delete_upload(path)
