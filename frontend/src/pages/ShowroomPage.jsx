import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getPublicClosets, getPublicSettings } from "../api.js";
import { addToCart, getCart } from "../lib/cart.js";
import CartIcon from "../components/CartIcon.jsx";
import { ArrowRight, Mail } from "../components/Icons.jsx";
import ShowroomClosetDetails from "./ShowroomClosetDetails.jsx";
import InquiryModal from "./InquiryModal.jsx";
import ClosetDesigner from "./ClosetDesigner.jsx";
import { totalWidth } from "./admin/closet3d/schema.js";
import { migrateConfig } from "./admin/closet-builder/defaults.js";
import "../styles/landing/01-shell-nav.css";
import "../styles/showroom/01-shell.css";
import "../styles/showroom/02-grid.css";
import "../styles/showroom/03-details.css";

const KIND_LABELS = {
  all: "כל הדגמים",
  sliding: "דלתות הזזה",
  hinged: "דלתות פתיחה",
};

export default function ShowroomPage() {
  const [params, setParams] = useSearchParams();
  const [closets, setClosets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [defaultImage, setDefaultImage] = useState(null);
  const [addedIds, setAddedIds] = useState(() =>
    new Set(getCart().map((i) => i.templateId))
  );
  const [selectedCloset, setSelectedCloset] = useState(null);
  const [inquiryCloset, setInquiryCloset] = useState(null);
  const [designingCloset, setDesigningCloset] = useState(null);

  const kind = params.get("kind") || "all";

  useEffect(() => {
    setLoading(true);
    getPublicClosets()
      .then((rows) => setClosets(rows || []))
      .catch(() => setClosets([]))
      .finally(() => setLoading(false));
    getPublicSettings()
      .then((s) => setDefaultImage(s.default_closet_image || null))
      .catch(() => {});
  }, []);

  function handleAddToCart(closet) {
    const id = "closet-" + closet.id + "-" + Date.now();
    addToCart({ id, templateId: closet.id, name: closet.name, image_path: closet.image_path });
    setAddedIds((prev) => new Set([...prev, closet.id]));
  }

  function handleCardClick(closet) {
    setSelectedCloset(closet);
  }

  const filtered = kind === "all"
    ? closets
    : closets.filter((c) => {
        try {
          const cfg = JSON.parse(c.config_json || "{}");
          const closetKind = cfg.kind || cfg.doors?.[0]?.kind;
          return closetKind === kind;
        }
        catch { return false; }
      });

  function handleDesign(closet) {
    const cfg = (() => { try { return migrateConfig(JSON.parse(closet.config_json || "{}")); } catch { return {}; } })();
    setDesigningCloset({ ...closet, config: cfg });
    setSelectedCloset(null);
  }

  return (
    <div className="showroom">
      {inquiryCloset && (
        <InquiryModal item={inquiryCloset} onClose={() => setInquiryCloset(null)} />
      )}
      {designingCloset && (
        <ClosetDesigner
          item={designingCloset}
          onClose={() => setDesigningCloset(null)}
        />
      )}
      {selectedCloset && !designingCloset && (
        <ShowroomClosetDetails
          item={selectedCloset}
          onClose={() => setSelectedCloset(null)}
          onAddToCart={(closet) => { handleAddToCart(closet); setSelectedCloset(null); }}
          onDesign={handleDesign}
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
                onCardClick={() => handleCardClick(c)}
                onInquiry={() => setInquiryCloset(c)}
                defaultImage={defaultImage}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ShowroomCard({ closet, added, onAddToCart, onCardClick, onInquiry, defaultImage }) {
  const cfg = (() => { try { return migrateConfig(JSON.parse(closet.config_json || "{}")); } catch { return {}; } })();
  const widthCm = cfg && Object.keys(cfg).length ? Math.round(totalWidth(cfg)) : null;
  const doorCount = cfg.doors?.length ?? null;

  const metaParts = [];
  if (doorCount) metaParts.push(`${doorCount} דלתות`);
  if (widthCm) metaParts.push(`רוחב ${widthCm} ס״מ`);

  return (
    <div className="showroom-card">
      <div className="showroom-card__head">
        <h3 className="showroom-card__name">{closet.name}</h3>
      </div>
      <button
        type="button"
        className="showroom-card__image-wrap showroom-card__image-wrap--clickable"
        onClick={onCardClick}
        aria-label={`פרטים על ${closet.name}`}
      >
        {closet.image_path || defaultImage ? (
          <img
            className="showroom-card__photo"
            src={`/uploads/${closet.image_path || defaultImage}`}
            alt={closet.name}
            loading="lazy"
          />
        ) : (
          <div className="showroom-card__placeholder">🪟</div>
        )}
        {closet.is_display_sale && (
          <span className="showroom-card__badge">מתצוגה</span>
        )}
      </button>
      <div className="showroom-card__foot">
        <div className="showroom-card__foot-row">
          {closet.display_sale_price ? (
            <span className="showroom-card__price">₪{Number(closet.display_sale_price).toLocaleString()}</span>
          ) : metaParts.length > 0 ? (
            <span className="showroom-card__meta">{metaParts.join(" · ")}</span>
          ) : null}
          <div className="showroom-card__foot-actions">
            <button type="button" className="showroom-card__icon-btn" onClick={onInquiry} aria-label="שלח פנייה" title="שלח פנייה">
              <Mail />
            </button>
            <button
              className={"showroom-card__add-btn" + (added ? " showroom-card__add-btn--added" : "")}
              onClick={onAddToCart}
              disabled={added}
            >
              {added ? "✓ נוסף לסל" : "הוסף לסל"}
            </button>
          </div>
        </div>
        {closet.display_sale_price && metaParts.length > 0 && (
          <span className="showroom-card__meta">{metaParts.join(" · ")}</span>
        )}
      </div>
    </div>
  );
}
