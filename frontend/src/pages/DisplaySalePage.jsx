import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDisplaySale } from "../api.js";
import { addToCart } from "../lib/cart.js";
import ClosetCard from "../components/ClosetCard.jsx";
import "./ShowroomPage.css";

export default function DisplaySalePage() {
  const [closets, setClosets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState(null);

  useEffect(() => {
    getDisplaySale()
      .then(setClosets)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleAddToCart(closet) {
    addToCart({
      id: `display-${closet.id}-${Date.now()}`,
      templateId: closet.id,
      name: closet.name,
      displaySaleId: closet.id,
      displaySalePrice: closet.display_sale_price,
      image_path: closet.image_path,
    });
    setAddedId(closet.id);
    setTimeout(() => setAddedId(null), 1500);
  }

  return (
    <div className="showroom">
      <header className="showroom-header">
        <Link to="/" className="showroom-back">← חזרה</Link>
        <h1>מכירת מתצוגה</h1>
        <Link to="/cart" className="showroom-cart-link">לסל הצעות →</Link>
      </header>

      {loading ? (
        <div className="showroom-loading">טוען...</div>
      ) : closets.length === 0 ? (
        <div className="showroom-empty">אין מוצרי מתצוגה כרגע</div>
      ) : (
        <div className="showroom-grid" style={{ padding: "1.25rem" }}>
          {closets.map((c) => (
            <ClosetCard
              key={c.id}
              closet={c}
              onAddToCart={() => handleAddToCart(c)}
              added={addedId === c.id}
              showPrice
            />
          ))}
        </div>
      )}
    </div>
  );
}
