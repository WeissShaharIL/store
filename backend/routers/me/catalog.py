from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import get_current_user
from db import get_db
from helpers import resolve_customer_catalog
from models import User
from schemas import CatalogItem

router = APIRouter()


@router.get("/catalog", response_model=List[CatalogItem])
def my_catalog(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return resolve_customer_catalog(db, user, include_hidden=False)
