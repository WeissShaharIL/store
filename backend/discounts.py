from decimal import Decimal, ROUND_HALF_UP


def apply_discounts(price, user) -> dict:
    """Compute per-item discount fields for a CatalogItem.

    Returns the four discount fields — only populated when the corresponding
    toggle is enabled on the user. Prices are rounded to whole shekels.
    """
    out = {
        "cash_discount_percent": None,
        "cash_discount_price": None,
        "buy_now_discount_percent": None,
        "buy_now_discount_price": None,
    }
    p = Decimal(price)

    if user.cash_discount_enabled:
        pct = Decimal(user.cash_discount_percent)
        out["cash_discount_percent"] = pct
        out["cash_discount_price"] = (
            (p * (Decimal(100) - pct) / Decimal(100))
            .quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        )

    if user.buy_now_discount_enabled:
        pct = Decimal(user.buy_now_discount_percent)
        out["buy_now_discount_percent"] = pct
        out["buy_now_discount_price"] = (
            (p * (Decimal(100) - pct) / Decimal(100))
            .quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        )

    return out
