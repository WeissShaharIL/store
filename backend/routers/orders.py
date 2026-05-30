import csv
import io
import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from auth import require_admin
from db import get_db
from models import ClosetOrder, Lead, utcnow
import activity as act

router = APIRouter(dependencies=[Depends(require_admin)])

VALID_STATUSES = {"new", "in_production", "ready", "delivered", "cancelled"}


# ── Schemas ───────────────────────────────────────────────────────────────────

class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    lead_id: Optional[int]
    customer_name: str
    phone: str
    email: Optional[str]
    address: Optional[str]
    cart: List = []
    total_amount: Optional[float]
    status: str
    admin_notes: Optional[str]
    created_at: datetime
    updated_at: datetime


class OrderCreate(BaseModel):
    lead_id: int


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None
    total_amount: Optional[float] = None


def _to_out(row: ClosetOrder) -> OrderOut:
    try:
        cart = json.loads(row.cart_snapshot or "[]")
        if not isinstance(cart, list):
            cart = []
    except (TypeError, ValueError):
        cart = []
    return OrderOut(
        id=row.id, lead_id=row.lead_id, customer_name=row.customer_name,
        phone=row.phone, email=row.email, address=row.address, cart=cart,
        total_amount=float(row.total_amount) if row.total_amount is not None else None,
        status=row.status, admin_notes=row.admin_notes,
        created_at=row.created_at, updated_at=row.updated_at,
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/counts")
def order_counts(db: Session = Depends(get_db)):
    base = db.query(ClosetOrder)
    out = {"all": base.count()}
    for s in VALID_STATUSES:
        out[s] = base.filter(ClosetOrder.status == s).count()
    return out


@router.get("", response_model=List[OrderOut])
def list_orders(
    status: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    date_from: Optional[str] = Query(default=None),  # YYYY-MM-DD
    date_to: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(ClosetOrder).order_by(ClosetOrder.created_at.desc())
    if status:
        if status not in VALID_STATUSES:
            raise HTTPException(status_code=422, detail="סטטוס לא תקין")
        query = query.filter(ClosetOrder.status == status)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            (ClosetOrder.customer_name.ilike(like)) | (ClosetOrder.phone.ilike(like))
        )
    if date_from:
        try:
            query = query.filter(ClosetOrder.created_at >= datetime.fromisoformat(date_from))
        except ValueError:
            raise HTTPException(status_code=422, detail="תאריך התחלה לא תקין")
    if date_to:
        try:
            # include the whole end day
            end = datetime.fromisoformat(date_to)
            end = end.replace(hour=23, minute=59, second=59)
            query = query.filter(ClosetOrder.created_at <= end)
        except ValueError:
            raise HTTPException(status_code=422, detail="תאריך סיום לא תקין")
    return [_to_out(r) for r in query.all()]


@router.post("", response_model=OrderOut, status_code=201)
def create_order(payload: OrderCreate, request: Request, db: Session = Depends(get_db)):
    lead = db.get(Lead, payload.lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="פנייה לא נמצאה")

    # Best-effort total: sum displaySalePrice / snapshot.priceEstimate per item.
    total = None
    try:
        cart = json.loads(lead.cart_snapshot or "[]")
        s = 0.0
        for it in cart if isinstance(cart, list) else []:
            p = it.get("displaySalePrice") or (it.get("snapshot") or {}).get("priceEstimate")
            if p:
                s += float(p)
        total = s or None
    except Exception:
        total = None

    row = ClosetOrder(
        lead_id=lead.id,
        customer_name=lead.name,
        phone=lead.phone,
        email=lead.email,
        address=lead.address,
        cart_snapshot=lead.cart_snapshot or "[]",
        total_amount=total,
        status="new",
    )
    db.add(row)
    # Mark the lead as closed now that it became an order.
    lead.status = "closed"
    if lead.contacted_at is None:
        lead.contacted_at = utcnow()
    db.commit()
    db.refresh(row)
    act.record(db, "order_created", request=request, actor=row.customer_name,
               details={"order_id": row.id, "lead_id": lead.id})
    return _to_out(row)


@router.get("/export.csv")
def export_orders_csv(db: Session = Depends(get_db)):
    rows = db.query(ClosetOrder).order_by(ClosetOrder.created_at.desc()).all()
    buf = io.StringIO()
    buf.write("﻿")
    w = csv.writer(buf)
    w.writerow(["מספר הזמנה", "תאריך", "שם", "טלפון", "אימייל", "כתובת", "סטטוס", "סכום", "פריטים"])
    for r in rows:
        try:
            cart = json.loads(r.cart_snapshot or "[]")
            n = len(cart) if isinstance(cart, list) else 0
        except (TypeError, ValueError):
            n = 0
        w.writerow([
            r.id,
            r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "",
            r.customer_name or "", r.phone or "", r.email or "", r.address or "",
            r.status or "", r.total_amount if r.total_amount is not None else "", n,
        ])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="orders.csv"'},
    )


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    row = db.get(ClosetOrder, order_id)
    if row is None:
        raise HTTPException(status_code=404, detail="הזמנה לא נמצאה")
    return _to_out(row)


@router.patch("/{order_id}", response_model=OrderOut)
def update_order(order_id: int, payload: OrderUpdate, db: Session = Depends(get_db)):
    row = db.get(ClosetOrder, order_id)
    if row is None:
        raise HTTPException(status_code=404, detail="הזמנה לא נמצאה")
    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        if data["status"] not in VALID_STATUSES:
            raise HTTPException(status_code=422, detail="סטטוס לא תקין")
        row.status = data["status"]
    if "admin_notes" in data:
        row.admin_notes = data["admin_notes"]
    if "total_amount" in data:
        row.total_amount = data["total_amount"]
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.delete("/{order_id}", status_code=204)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    row = db.get(ClosetOrder, order_id)
    if row is not None:
        db.delete(row)
        db.commit()
