import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDisplaySale } from "../api.js";
import { parseConfig } from "../lib/parseConfig.js";
import { totalWidth } from "./admin/closet3d/schema.js";
import { addToCart, getCart } from "../lib/cart.js";
import CartIcon from "../components/CartIcon.jsx";
import { ArrowRight, Mail } from "../components/Icons.jsx";
import ShowroomClosetDetails from "./ShowroomClosetDetails.jsx";
import InquiryModal from "./InquiryModal.jsx";
import "../styles/landing/01-shell-nav.css";
import "../styles/showroom/01-shell.css";
import "../styles/showroom/02-grid.css";
import "../styles/showroom/03-details.css";

export default function DisplaySalePage() {
  const [closets, setClosets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState(() =>
    new Set(getCart().filter((i) => i.displaySaleId).map((i) => i.templateId))
  );
  const [selectedCloset, setSelectedCloset] = useState(null);
  const [inquiryCloset, setInquiryCloset] = useState(null);

  useEffect(() => {
    getDisplaySale()
      .then((rows) => setClosets(rows || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleAddToCart(closet) {
    if (addedIds.has(closet.id)) return;
    addToCart({
      id: "display-" + closet.id + "-" + Date.now(),
      templateId: closet.id,
      name: closet.name,
      displaySaleId: closet.id,
      displaySalePrice: closet.display_sale_price,
      image_path: closet.image_path,
    });
    setAddedIds((prev) => new Set([...prev, closet.id]));
  }

  return (
    <div className="showroom">
      {inquiryCloset && (
        <InquiryModal item={inquiryCloset} onClose={() => setInquiryCloset(null)} />
      )}
      {selectedCloset && (
        <ShowroomClosetDetails
          item={selectedCloset}
          onClose={() => setSelectedCloset(null)}
          onAddToCart={(closet) => { handleAddToCart(closet); setSelectedCloset(null); }}
          added={addedIds.has(selectedCloset.id)}
        />
      )}
      <header className="landing-nav showroom__nav">
        <div className="landing-nav__inner">
          <Link to="/" className="landing-nav__brand">
            <span className="landing-nav__brand-mark">Store</span>
            <span className="landing-nav__brand-sub">ארונות</span>
          </Link>
          <nav className="landing-nav__links" aria-label="ניווט ראשי">
            <Link to="/">דף הבית</Link>
            <Link to="/showroom?kind=sliding">דלתות הזזה</Link>
            <Link to="/showroom?kind=hinged">דלתות פתיחה</Link>
            <Link to="/display-sale">מכירה מתצוגה</Link>
          </nav>
          <div className="landing-nav__right">
            <CartIcon />
          </div>
        </div>
      </header>

      <header className="showroom__header">
        <Link to="/" className="showroom__back">
          <ArrowRight /> חזרה לדף הבית
        </Link>
        <h1 className="showroom__title">מכירה מתצוגה</h1>
        <p className="showroom__sub">
          ארונות תצוגה במחירים מיוחדים — חד-פעמי, כמות מוגבלת.
        </p>
      </header>

      <main className="showroom__main">
        {loading ? (
          <div className="showroom-grid__empty muted">טוען…</div>
        ) : closets.length === 0 ? (
          <div className="showroom-grid__empty">
            <p>אין מוצרי מתצוגה כרגע. בדקו שוב בקרוב.</p>
          </div>
        ) : (
          <div className="showroom-grid">
            {closets.map((c) => {
              const cfg = parseConfig(c.config_json);
              const widthCm = Object.keys(cfg).length ? Math.round(totalWidth(cfg)) : null;
              const doorCount = cfg.doors?.length ?? null;
              const metaParts = [];
              if (doorCount) metaParts.push(`${doorCount} דלתות`);
              if (widthCm) metaParts.push(`רוחב ${widthCm} ס״מ`);
              return (
                <div key={c.id} className="showroom-card">
                  <div className="showroom-card__head">
                    <h3 className="showroom-card__name">{c.name}</h3>
                  </div>
                  <button
                    type="button"
                    className="showroom-card__image-wrap showroom-card__image-wrap--clickable"
                    onClick={() => setSelectedCloset(c)}
                    aria-label={`פרטים על ${c.name}`}
                  >
                    {c.image_path ? (
                      <img
                        className="showroom-card__photo"
                        src={`/uploads/${c.image_path}`}
                        alt={c.name}
                        loading="lazy"
                      />
                    ) : (
                      <div className="showroom-card__placeholder">🪟</div>
                    )}
                    <span className="showroom-card__badge">מתצוגה</span>
                  </button>
                  <div className="showroom-card__foot">
                    <div className="showroom-card__foot-row">
                      {c.display_sale_price ? (
                        <span className="showroom-card__price">₪{Number(c.display_sale_price).toLocaleString()}</span>
                      ) : metaParts.length > 0 ? (
                        <span className="showroom-card__meta">{metaParts.join(" · ")}</span>
                      ) : null}
                      <div className="showroom-card__foot-actions">
                        <button type="button" className="showroom-card__icon-btn" onClick={() => setInquiryCloset(c)} aria-label="שלח פנייה" title="שלח פנייה">
                          <Mail />
                        </button>
                        <button
                          className={"showroom-card__add-btn" + (addedIds.has(c.id) ? " showroom-card__add-btn--added" : "")}
                          onClick={() => handleAddToCart(c)}
                          disabled={addedIds.has(c.id)}
                        >
                          {addedIds.has(c.id) ? "✓ נוסף לעגלה" : "הוסף לעגלה"}
                        </button>
                      </div>
                    </div>
                    {c.display_sale_price && metaParts.length > 0 && (
                      <span className="showroom-card__meta">{metaParts.join(" · ")}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
