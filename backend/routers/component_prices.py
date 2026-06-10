from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import require_admin
from db import get_db
from enums import PriceBasis
from models import ComponentPrice
from schemas import ComponentPriceCreate, ComponentPriceOut, ComponentPriceUpdate

router = APIRouter(dependencies=[Depends(require_admin)])
public_router = APIRouter()

VALID_BASIS = PriceBasis.values()


def _to_out(row: ComponentPrice) -> ComponentPriceOut:
    return ComponentPriceOut(
        id=row.id,
        name=row.name,
        sku=row.sku,
        price_basis=row.price_basis,
        rules=row.rules,
        sort_order=row.sort_order,
        item_type=row.item_type,
        color=row.color,
        min_per_cabin=row.min_per_cabin,
        max_per_cabin=row.max_per_cabin,
        updated_at=row.updated_at,
    )


@router.get("", response_model=List[ComponentPriceOut])
def list_component_prices(db: Session = Depends(get_db)):
    rows = db.query(ComponentPrice).order_by(ComponentPrice.sort_order, ComponentPrice.id).all()
    return [_to_out(r) for r in rows]


@public_router.get("", response_model=List[ComponentPriceOut])
def list_component_prices_public(db: Session = Depends(get_db)):
    rows = db.query(ComponentPrice).order_by(ComponentPrice.sort_order, ComponentPrice.id).all()
    return [_to_out(r) for r in rows]


@router.post("", response_model=ComponentPriceOut, status_code=201)
def create_component_price(payload: ComponentPriceCreate, db: Session = Depends(get_db)):
    if payload.price_basis not in VALID_BASIS:
        raise HTTPException(422, detail=f"בסיס תמחור חייב להיות: {', '.join(sorted(VALID_BASIS))}")
    row = ComponentPrice(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.patch("/{item_id}", response_model=ComponentPriceOut)
def update_component_price(item_id: int, payload: ComponentPriceUpdate, db: Session = Depends(get_db)):
    row = db.get(ComponentPrice, item_id)
    if row is None:
        raise HTTPException(404, detail="רכיב לא נמצא")
    data = payload.model_dump(exclude_unset=True)
    if "price_basis" in data and data["price_basis"] not in VALID_BASIS:
        raise HTTPException(422, detail=f"בסיס תמחור חייב להיות: {', '.join(sorted(VALID_BASIS))}")
    for k, v in data.items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.delete("/{item_id}", status_code=204)
def delete_component_price(item_id: int, db: Session = Depends(get_db)):
    row = db.get(ComponentPrice, item_id)
    if row is None:
        return
    db.delete(row)
    db.commit()
