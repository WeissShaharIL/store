import { formatILS } from "../lib/money.js";

export default function PriceBlock({ item, size = "md" }) {
  const main = item.price ?? item.base_price;
  return (
    <div className={`price-block price-block--${size}`}>
      <div className="price-block__main">{formatILS(main)}</div>
      {item.cash_discount_price != null && (
        <div className="price-block__discount">
          <span className="price-block__label">מזומן</span>
          <span className="price-block__value">{formatILS(item.cash_discount_price)}</span>
          {item.cash_discount_percent != null && (
            <span className="price-block__pct">
              −{Number(item.cash_discount_percent).toLocaleString("he-IL", {
                maximumFractionDigits: 1,
              })}%
            </span>
          )}
        </div>
      )}
      {item.buy_now_discount_price != null && (
        <div className="price-block__discount price-block__discount--buy">
          <span className="price-block__label">קנייה מיידית</span>
          <span className="price-block__value">{formatILS(item.buy_now_discount_price)}</span>
          {item.buy_now_discount_percent != null && (
            <span className="price-block__pct">
              −{Number(item.buy_now_discount_percent).toLocaleString("he-IL", {
                maximumFractionDigits: 1,
              })}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
