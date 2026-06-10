"""Canonical enumerations shared across routers.

These are the single source of truth for the small fixed value-sets that were
previously redeclared as literal `set`s in each router. Routers derive their
validation sets from `.values()` and keep their Hebrew error messages (typing a
Pydantic body field as the enum would surface Pydantic's English 422 list, which
the frontend can't render — it expects a string `detail`).
"""
from enum import Enum


class StrEnum(str, Enum):
    @classmethod
    def values(cls) -> set[str]:
        return {member.value for member in cls}


class LeadStatus(StrEnum):
    NEW = "new"
    CONTACTED = "contacted"
    CLOSED = "closed"


class OrderStatus(StrEnum):
    NEW = "new"
    IN_PRODUCTION = "in_production"
    READY = "ready"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class PriceBasis(StrEnum):
    FIXED = "fixed"
    WIDTH = "width"
    HEIGHT = "height"
    DEPTH = "depth"
