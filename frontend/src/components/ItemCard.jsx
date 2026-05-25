import PriceBlock from "./PriceBlock.jsx";

export default function ItemCard({ item, children, dim = false }) {
  return (
    <div className={`item-card${dim ? " item-card--dim" : ""}`}>
      <div className="item-card__image">
        {item.image_path ? (
          <img src={`/uploads/${item.image_path}`} alt={item.name} />
        ) : (
          <div className="item-card__placeholder">אין תמונה</div>
        )}
      </div>
      <div className="item-card__body">
        <div className="item-card__name">{item.name}</div>
        <div className="item-card__code">קוד: {item.product_code}</div>
        {item.description && <div className="item-card__desc">{item.description}</div>}
        <PriceBlock item={item} />
        {children}
      </div>
    </div>
  );
}
