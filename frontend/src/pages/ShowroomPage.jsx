import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getPublicClosets } from "../api.js";
import { addToCart, getCart } from "../lib/cart.js";
import CartIcon from "../components/CartIcon.jsx";
import { ArrowRight } from "../components/Icons.jsx";
import "../styles/landing/01-shell-nav.css";
import "../styles/showroom/01-shell.css";
import "../styles/showroom/02-grid.css";

const KIND_LABELS = {
  all: "כל הדגמים",
  sliding: "דלתות הזזה",
  hinged: "דלתות פתיחה",
};

export default function ShowroomPage() {
  const [params, setParams] = useSearchParams();
  const [closets, setClosets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState(() =>
    new Set(getCart().map((i) => i.templateId))
  );

  const kind = params.get("kind") || "all";

  useEffect(() => {
    setLoading(true);
    getPublicClosets()
      .then((rows) => setClosets(rows || []))
      .catch(() => setClosets([]))
      .finally(() => setLoading(false));
  }, []);

  function handleAddToCart(closet) {
    const id = "closet-" + closet.id + "-" + Date.now();
    addToCart({ id, templateId: closet.id, name: closet.name, image_path: closet.image_path });
    setAddedIds((prev) => new Set([...prev, closet.id]));
  }

  const filtered = kind === "all"
    ? closets
    : closets.filter((c) => {
        try { return JSON.parse(c.config_json || "{}").doorKind === kind; }
        catch { return true; }
      });

  return (
    <div className="showroom">
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
        <h1 className="showroom__title">{KIND_LABELS[kind] || "התצוגה"}</h1>
        <p className="showroom__sub">
          {kind === "sliding"
            ? "דגמי ארונות עם דלתות מסילה. בחרו דגם והוסיפו לסל ההצעות."
            : kind === "hinged"
            ? "דגמי ארונות עם דלתות צירים. בחרו דגם והוסיפו לסל ההצעות."
            : "כל דגמי הארונות שלנו. בחרו דגם והוסיפו לסל ההצעות."}
        </p>
      </header>

      <div className="showroom__filters">
        {["all", "sliding", "hinged"].map((k) => (
          <button
            key={k}
            className={"showroom__filter-btn" + (kind === k ? " showroom__filter-btn--active" : "")}
            onClick={() => setParams(k === "all" ? {} : { kind: k })}
          >
            {KIND_LABELS[k]}
          </button>
        ))}
      </div>

      <main className="showroom__main">
        {loading ? (
          <div className="showroom-grid__empty muted">טוען דגמים…</div>
        ) : filtered.length === 0 ? (
          <div className="showroom-grid__empty">
            <p>אין דגמים להצגה כרגע.</p>
          </div>
        ) : (
          <div className="showroom-grid">
            {filtered.map((c) => (
              <ShowroomCard
                key={c.id}
                closet={c}
                added={addedIds.has(c.id)}
                onAddToCart={() => handleAddToCart(c)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ShowroomCard({ closet, added, onAddToCart }) {
  return (
    <div className="showroom-card">
      <div className="showroom-card__head">
        <h3 className="showroom-card__name">{closet.name}</h3>
      </div>
      <div className="showroom-card__image-wrap">
        {closet.image_path ? (
          <img
            className="showroom-card__photo"
            src={`/uploads/${closet.image_path}`}
            alt={closet.name}
            loading="lazy"
          />
        ) : (
          <div className="showroom-card__placeholder">🪟</div>
        )}
        {closet.is_display_sale && (
          <span className="showroom-card__badge">מתצוגה</span>
        )}
      </div>
      <div className="showroom-card__foot">
        {closet.display_sale_price && (
          <span className="showroom-card__price">
            ₪{closet.display_sale_price.toLocaleString()}
          </span>
        )}
        <button
          className={"showroom-card__add-btn" + (added ? " showroom-card__add-btn--added" : "")}
          onClick={onAddToCart}
          disabled={added}
        >
          {added ? "✓ נוסף לסל" : "הוסף לסל"}
        </button>
      </div>
    </div>
  );
}
