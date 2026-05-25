import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from auth import require_admin
from db import get_db
from models import Lead, utcnow
from schemas import LeadCreate, LeadOut, LeadUpdate

public_router = APIRouter()
admin_router = APIRouter(dependencies=[Depends(require_admin)])

VALID_STATUSES = {"new", "contacted", "closed"}


def _to_out(row: Lead) -> LeadOut:
    try:
        cart = json.loads(row.cart_snapshot or "[]")
        if not isinstance(cart, list):
            cart = []
    except (TypeError, ValueError):
        cart = []
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
def submit_lead(payload: LeadCreate, db: Session = Depends(get_db)):
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
    return _to_out(row)


@admin_router.get("/unread-count")
def unread_leads_count(db: Session = Depends(get_db)):
    count = (
        db.query(Lead)
        .filter(Lead.status == "new")
        .filter(Lead.deleted_at.is_(None))
        .count()
    )
    return {"count": count}


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
    return [_to_out(r) for r in q.all()]


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
