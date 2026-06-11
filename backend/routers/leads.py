import csv
import io
import json
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import require_admin
from db import get_db
from enums import LeadStatus
from helpers import parse_cart
from models import Lead, utcnow
from schemas import LeadCreate, LeadOut, LeadUpdate
import activity as act
import notify
from limiter import limiter

logger = logging.getLogger(__name__)

public_router = APIRouter()
admin_router = APIRouter(dependencies=[Depends(require_admin)])

VALID_STATUSES = LeadStatus.values()

# Backward-compatible bound: endpoints still return a plain array, but never more
# than MAX_PAGE rows in one response. Callers can page with limit/offset.
DEFAULT_PAGE = 500
MAX_PAGE = 1000


def _to_out(row: Lead) -> LeadOut:
    cart = parse_cart(row.cart_snapshot)
    return LeadOut(
        id=row.id,
        name=row.name,
        phone=row.phone,
        email=row.email,
        address=row.address,
        notes=row.notes,
        cart=cart,
        status=row.status,
        admin_notes=row.admin_notes,
        created_at=row.created_at,
        updated_at=row.updated_at,
        contacted_at=row.contacted_at,
        deleted_at=row.deleted_at,
    )


@public_router.post("", response_model=LeadOut, status_code=201)
@limiter.limit("10/minute")
def submit_lead(payload: LeadCreate, request: Request, db: Session = Depends(get_db)):
    row = Lead(
        name=payload.name.strip(),
        phone=payload.phone.strip(),
        email=(payload.email or "").strip() or None,
        address=(payload.address or "").strip() or None,
        notes=(payload.notes or "").strip() or None,
        cart_snapshot=json.dumps(
            [item.model_dump(by_alias=False) for item in payload.cart],
            ensure_ascii=False,
        ),
        status="new",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    act.record(db, "lead_submitted", request=request, actor=payload.name.strip(),
               details={"phone": payload.phone.strip(), "lead_id": row.id,
                        "items": len(payload.cart)})
    notify.notify_new_lead(row)
    return _to_out(row)


@admin_router.get("/unread-count")
def unread_leads_count(
    since: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    """Count of new (unhandled) leads for the admin-tab badge.

    `since` (ISO datetime) narrows to leads created after that moment — the
    admin UI passes its last-visit timestamp so the badge clears once the
    leads were seen and only returns for genuinely new arrivals.
    """
    q = (
        db.query(Lead)
        .filter(Lead.status == "new")
        .filter(Lead.deleted_at.is_(None))
    )
    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
            q = q.filter(Lead.created_at > since_dt)
        except ValueError:
            pass  # ignore a malformed timestamp — show the full count
    return {"count": q.count()}


@admin_router.get("/counts")
def lead_counts(db: Session = Depends(get_db)):
    """Per-status counts of active (non-deleted) leads, for the admin header."""
    rows = (
        db.query(Lead.status, func.count())
        .filter(Lead.deleted_at.is_(None))
        .group_by(Lead.status)
        .all()
    )
    by_status = {status: n for status, n in rows}
    out = {"all": sum(by_status.values())}
    for status in LeadStatus.values():
        out[status] = by_status.get(status, 0)
    return out


@admin_router.get("/export.csv")
def export_leads_csv(db: Session = Depends(get_db)):
    """Download all active leads as a CSV (UTF-8 with BOM for Excel/Hebrew)."""
    rows = (
        db.query(Lead)
        .filter(Lead.deleted_at.is_(None))
        .order_by(Lead.created_at.desc())
        .all()
    )
    buf = io.StringIO()
    buf.write("﻿")  # BOM so Excel reads Hebrew correctly
    writer = csv.writer(buf)
    writer.writerow(["תאריך", "שם", "טלפון", "אימייל", "כתובת", "סטטוס", "פריטים", "הערות"])
    for r in rows:
        n_items = len(parse_cart(r.cart_snapshot))
        writer.writerow([
            r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "",
            r.name or "", r.phone or "", r.email or "", r.address or "",
            r.status or "", n_items, (r.notes or "").replace("\n", " "),
        ])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="leads.csv"'},
    )


@admin_router.get("/trash", response_model=List[LeadOut])
def list_trashed_leads(db: Session = Depends(get_db)):
    rows = (
        db.query(Lead)
        .filter(Lead.deleted_at.is_not(None))
        .order_by(Lead.deleted_at.desc(), Lead.id.desc())
        .all()
    )
    return [_to_out(r) for r in rows]


@admin_router.get("", response_model=List[LeadOut])
def list_leads(
    status: Optional[str] = Query(default=None),
    limit: int = Query(default=DEFAULT_PAGE, ge=1, le=MAX_PAGE),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    q = (
        db.query(Lead)
        .filter(Lead.deleted_at.is_(None))
        .order_by(Lead.created_at.desc(), Lead.id.desc())
    )
    if status:
        if status not in VALID_STATUSES:
            raise HTTPException(
                status_code=422,
                detail=f"status חייב להיות אחד מ: {', '.join(sorted(VALID_STATUSES))}",
            )
        q = q.filter(Lead.status == status)
    rows = q.limit(limit).offset(offset).all()
    if len(rows) == limit:
        logger.warning("list_leads hit the page limit (%s); results may be truncated", limit)
    return [_to_out(r) for r in rows]


@admin_router.get("/{lead_id}", response_model=LeadOut)
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    row = db.get(Lead, lead_id)
    if row is None:
        raise HTTPException(status_code=404, detail="פנייה לא נמצאה")
    return _to_out(row)


@admin_router.patch("/{lead_id}", response_model=LeadOut)
def update_lead(lead_id: int, payload: LeadUpdate, db: Session = Depends(get_db)):
    row = db.get(Lead, lead_id)
    if row is None:
        raise HTTPException(status_code=404, detail="פנייה לא נמצאה")
    if row.deleted_at is not None:
        raise HTTPException(status_code=409, detail="אי אפשר לערוך פנייה שנמחקה. שחזר אותה תחילה.")
    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        if data["status"] not in VALID_STATUSES:
            raise HTTPException(
                status_code=422,
                detail=f"status חייב להיות אחד מ: {', '.join(sorted(VALID_STATUSES))}",
            )
        if data["status"] != "new" and row.contacted_at is None:
            row.contacted_at = utcnow()
        row.status = data["status"]
    if "admin_notes" in data:
        row.admin_notes = data["admin_notes"]
    db.commit()
    db.refresh(row)
    return _to_out(row)


@admin_router.delete("/{lead_id}", status_code=204)
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    row = db.get(Lead, lead_id)
    if row is None:
        return
    if row.deleted_at is None:
        row.deleted_at = utcnow()
        db.commit()


@admin_router.post("/{lead_id}/restore", response_model=LeadOut)
def restore_lead(lead_id: int, db: Session = Depends(get_db)):
    row = db.get(Lead, lead_id)
    if row is None:
        raise HTTPException(status_code=404, detail="פנייה לא נמצאה")
    if row.deleted_at is not None:
        row.deleted_at = None
        db.commit()
        db.refresh(row)
    return _to_out(row)


@admin_router.delete("/{lead_id}/permanent", status_code=204)
def delete_lead_permanent(lead_id: int, db: Session = Depends(get_db)):
    row = db.get(Lead, lead_id)
    if row is None:
        return
    if row.deleted_at is None:
        raise HTTPException(
            status_code=409,
            detail="אי אפשר למחוק לצמיתות פנייה פעילה. שלח לאשפה תחילה.",
        )
    db.delete(row)
    db.commit()
