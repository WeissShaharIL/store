"""Internal bug tracker — admin-only.

The admin documents bugs found anywhere in the app: a title + free-text
description plus image/video attachments to reproduce. Attachments live in
the regular uploads dir (served by nginx) but are NOT registered in the
media library — they're internal, not site content.
"""
import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import require_admin
from db import get_db
from helpers import ALLOWED_EXTENSIONS, VIDEO_EXTENSIONS, delete_upload, save_upload, save_video_upload
from models import BugReport
import activity as act

router = APIRouter(dependencies=[Depends(require_admin)])

VALID_STATUSES = {"open", "closed"}


class BugCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=8000)


class BugUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=8000)
    status: Optional[str] = None


class BugOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    attachments: List[dict]
    created_at: datetime
    updated_at: datetime


def _parse_attachments(raw: Optional[str]) -> list:
    try:
        parsed = json.loads(raw or "[]")
        return parsed if isinstance(parsed, list) else []
    except (TypeError, ValueError):
        return []


def _to_out(row: BugReport) -> BugOut:
    return BugOut(
        id=row.id,
        title=row.title,
        description=row.description,
        status=row.status,
        attachments=_parse_attachments(row.attachments),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _get_or_404(db: Session, bug_id: int) -> BugReport:
    row = db.get(BugReport, bug_id)
    if row is None:
        raise HTTPException(status_code=404, detail="הבאג לא נמצא")
    return row


@router.get("", response_model=List[BugOut])
def list_bugs(db: Session = Depends(get_db)):
    rows = (
        db.query(BugReport)
        .order_by(BugReport.status.desc(), BugReport.created_at.desc())
        .all()
    )
    return [_to_out(r) for r in rows]


@router.post("", response_model=BugOut, status_code=201)
def create_bug(payload: BugCreate, request: Request, db: Session = Depends(get_db)):
    row = BugReport(
        title=payload.title.strip(),
        description=(payload.description or "").strip() or None,
        status="open",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    act.record(db, "bug_opened", request=request, details={"bug_id": row.id, "title": row.title})
    return _to_out(row)


@router.patch("/{bug_id}", response_model=BugOut)
def update_bug(bug_id: int, payload: BugUpdate, db: Session = Depends(get_db)):
    row = _get_or_404(db, bug_id)
    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        if data["status"] not in VALID_STATUSES:
            raise HTTPException(status_code=422, detail="סטטוס לא תקין")
        row.status = data["status"]
    if "title" in data and data["title"]:
        row.title = data["title"].strip()
    if "description" in data:
        row.description = (data["description"] or "").strip() or None
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.delete("/{bug_id}", status_code=204)
def delete_bug(bug_id: int, db: Session = Depends(get_db)):
    row = db.get(BugReport, bug_id)
    if row is None:
        return
    for att in _parse_attachments(row.attachments):
        delete_upload(att.get("path"))
    db.delete(row)
    db.commit()


@router.post("/{bug_id}/attachments", response_model=BugOut, status_code=201)
def upload_attachment(bug_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Attach an image (jpg/png/webp) or a video (mp4/webm/mov/m4v) to a bug."""
    row = _get_or_404(db, bug_id)
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext in ALLOWED_EXTENSIONS:
        path, kind = save_upload(file), "image"
    elif ext in VIDEO_EXTENSIONS:
        path, kind = save_video_upload(file), "video"
    else:
        raise HTTPException(
            status_code=422,
            detail="סוג קובץ לא נתמך. מותר: תמונה (jpg/png/webp) או וידאו (mp4/webm/mov)",
        )
    attachments = _parse_attachments(row.attachments)
    attachments.append({"path": path, "kind": kind, "original_name": file.filename})
    row.attachments = json.dumps(attachments, ensure_ascii=False)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.delete("/{bug_id}/attachments/{index}", response_model=BugOut)
def delete_attachment(bug_id: int, index: int, db: Session = Depends(get_db)):
    row = _get_or_404(db, bug_id)
    attachments = _parse_attachments(row.attachments)
    if index < 0 or index >= len(attachments):
        raise HTTPException(status_code=404, detail="הקובץ לא נמצא")
    removed = attachments.pop(index)
    delete_upload(removed.get("path"))
    row.attachments = json.dumps(attachments, ensure_ascii=False)
    db.commit()
    db.refresh(row)
    return _to_out(row)
