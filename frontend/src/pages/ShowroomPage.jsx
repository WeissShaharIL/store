import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getDoorTypeCovers, getPublicClosets } from "../api.js";
import { addToCart } from "../lib/cart.js";
import ClosetCard from "../components/ClosetCard.jsx";
import "./ShowroomPage.css";

export default function ShowroomPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [closets, setClosets] = useState([]);
  const [covers, setCovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState(null);

  const doorKind = searchParams.get("type") || "all";

  useEffect(() => {
    setLoading(true);
    Promise.all([getPublicClosets(), getDoorTypeCovers()])
      .then(([cl, cv]) => {
        setClosets(cl);
        setCovers(cv);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleAddToCart(closet) {
    addToCart({
      id: `closet-${closet.id}-${Date.now()}`,
      templateId: closet.id,
      name: closet.name,
      config: JSON.parse(closet.config_json),
      image_path: closet.image_path,
    });
    setAddedId(closet.id);
    setTimeout(() => setAddedId(null), 1500);
  }

  const filtered =
    doorKind === "all"
      ? closets
      : closets.filter((c) => {
          try {
            const cfg = JSON.parse(c.config_json);
            return cfg.doorKind === doorKind;
          } catch {
            return true;
          }
        });

  return (
    <div className="showroom">
      <header className="showroom-header">
        <Link to="/" className="showroom-back">← חזרה</Link>
        <h1>התצוגה</h1>
        <Link to="/cart" className="showroom-cart-link">לסל הצעות →</Link>
      </header>

      <div className="showroom-filters">
        {["all", "hinged", "sliding"].map((kind) => (
          <button
            key={kind}
            className={`filter-btn${doorKind === kind ? " active" : ""}`}
            onClick={() => setSearchParams(kind === "all" ? {} : { type: kind })}
          >
            {kind === "all" ? "הכל" : kind === "hinged" ? "דלתות צירים" : "דלתות הזזה"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="showroom-loading">טוען...</div>
      ) : filtered.length === 0 ? (
        <div className="showroom-empty">אין ארונות להצגה כרגע</div>
      ) : (
        <div className="showroom-grid">
          {filtered.map((c) => (
            <ClosetCard
              key={c.id}
              closet={c}
              onAddToCart={() => handleAddToCart(c)}
              added={addedId === c.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
