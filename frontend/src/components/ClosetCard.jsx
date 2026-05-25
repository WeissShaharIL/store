import "./ClosetCard.css";

export default function ClosetCard({ closet, onAddToCart, added, showPrice = false }) {
  return (
    <div className="closet-card">
      <div className="closet-card-image">
        {closet.image_path ? (
          <img src={`/uploads/${closet.image_path}`} alt={closet.name} />
        ) : (
          <div className="closet-card-placeholder">🪟</div>
        )}
        {closet.is_display_sale && (
          <span className="closet-card-badge">מתצוגה</span>
        )}
      </div>
      <div className="closet-card-body">
        <h3 className="closet-card-name">{closet.name}</h3>
        {showPrice && closet.display_sale_price && (
          <p className="closet-card-price">{closet.display_sale_price}</p>
        )}
        {onAddToCart && (
          <button
            className={`closet-card-btn${added ? " added" : ""}`}
            onClick={onAddToCart}
            disabled={added}
          >
            {added ? "✓ נוסף לסל" : "הוסף לסל הצעות"}
          </button>
        )}
      </div>
    </div>
  );
}
