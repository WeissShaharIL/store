from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user
from db import get_db
from helpers import order_to_out, resolve_customer_catalog
from models import Order, OrderLine, User
from schemas import OrderCreate, OrderOut

router = APIRouter()


@router.post("/orders", response_model=OrderOut, status_code=201)
def create_my_order(
    payload: OrderCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Customer places an order. The server snapshots product code/name and
    computes the unit price from the catalog the customer sees — the client
    cannot dictate price."""
    if user.is_admin:
        raise HTTPException(status_code=400, detail="מנהל לא יכול ליצור הזמנה")

    catalog = resolve_customer_catalog(db, user, include_hidden=False)
    catalog_by_id = {c.id: c for c in catalog}

    order = Order(user_id=user.id, notes=(payload.notes or None))
    total = Decimal("0")
    for ln in payload.lines:
        ci = catalog_by_id.get(ln.item_id)
        if ci is None:
            raise HTTPException(status_code=400, detail="הפריט לא זמין בקטלוג שלך")
        unit = Decimal(ci.price)
        order.lines.append(
            OrderLine(
                item_id=ci.id,
                product_code=ci.product_code,
                name=ci.name,
                unit_price=unit,
                quantity=ln.quantity,
            )
        )
        total += unit * Decimal(ln.quantity)
    order.total_amount = total

    db.add(order)
    db.commit()
    db.refresh(order)
    return order_to_out(order, user)


@router.get("/orders", response_model=List[OrderOut])
def list_my_orders(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List the customer's own orders, newest first."""
    orders = (
        db.query(Order)
        .filter(Order.user_id == user.id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return [order_to_out(o, user) for o in orders]
