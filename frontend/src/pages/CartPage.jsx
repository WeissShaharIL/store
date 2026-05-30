import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { submitLead } from "../api.js";
import { clearCart, getCart, removeFromCart, subscribeToCart } from "../lib/cart.js";
import { parseConfig } from "../lib/parseConfig.js";
import { usePaletteColors } from "./admin/PaletteContext.jsx";
import CartIcon from "../components/CartIcon.jsx";
import { ArrowRight } from "../components/Icons.jsx";
import "../styles/landing/01-shell-nav.css";
import "./CartPage.css";

function CartNav() {
  return (
    <header className="landing-nav cart-nav">
      <div className="landing-nav__inner">
        <Link to="/" className="landing-nav__brand">
          <span className="landing-nav__brand-mark">Store</span>
          <span className="landing-nav__brand-sub">ארונות</span>
        </Link>
        <nav className="landing-nav__links" aria-label="ניווט ראשי">
          <Link to="/">דף הבית</Link>
          <Link to="/showroom?kind=sliding">דלתות הזזה</Link>
          <Link to="/showroom?kind=hinged">דלתות פתיחה</Link>
        </nav>
        <div className="landing-nav__right">
          <CartIcon />
        </div>
      </div>
    </header>
  );
}

export default function CartPage() {
  const { colors } = usePaletteColors();
  const colorName = (key) => colors[key]?.name ?? key;
  const [cart, setCart] = useState(getCart());
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [step, setStep] = useState("cart"); // "cart" | "contact" | "done"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Override body background so the dark-theme page background shows correctly
  // regardless of what the global body style sets.
  useEffect(() => {
    document.body.style.background = "#0d0d0f";
    return () => { document.body.style.background = ""; };
  }, []);

  useEffect(() => {
    return subscribeToCart((items) => setCart(items));
  }, []);

  function handleRemove(id) {
    removeFromCart(id);
    setCart(getCart());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) { setError("נא להזין שם מלא."); return; }

    const rawPhone = form.phone.trim();
    if (!rawPhone) { setError("נא להזין מספר טלפון."); return; }
    if (!/^[\d\s\-+()]{7,15}$/.test(rawPhone)) {
      setError("מספר הטלפון אינו תקין — יש להזין ספרות בלבד.");
      return;
    }

    const rawEmail = form.email.trim();
    if (rawEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      setError("כתובת האימייל אינה תקינה.");
      return;
    }

    setLoading(true);
    try {
      await submitLead({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        address: form.address || undefined,
        notes: form.notes || undefined,
        cart: cart.map((item) => ({
          id: item.id,
          templateId: item.templateId,
          name: item.name,
          config_json: item.config_json,
          snapshot: item.snapshot,
          displaySaleId: item.displaySaleId,
          displaySalePrice: item.displaySalePrice,
        })),
      });
      clearCart();
      setStep("done");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (step === "done") {
    return (
      <div className="cart-page">
        <CartNav />
        <div className="cart-page__inner cart-done">
          <div className="cart-done__icon">✓</div>
          <h2 className="cart-done__title">תודה! קיבלנו את הפנייה שלך</h2>
          <p className="cart-done__sub">ניצור קשר בהקדם עם הצעת מחיר.</p>
          <Link to="/" className="cart-btn cart-btn--primary">חזרה לדף הבית <ArrowRight /></Link>
        </div>
      </div>
    );
  }

  if (step === "contact") {
    return (
      <div className="cart-page">
        <CartNav />
        <div className="cart-page__inner">
          <button onClick={() => setStep("cart")} className="cart-back-btn">
            <ArrowRight style={{ transform: "rotate(180deg)" }} /> חזרה לעגלה
          </button>
          <h1 className="cart-page__title">פרטי קשר</h1>
          <form onSubmit={handleSubmit} className="cart-contact-form">
            <label className="cart-field">
              <span>שם מלא *</span>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </label>
            <label className="cart-field">
              <span>טלפון *</span>
              <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
            </label>
            <label className="cart-field">
              <span>אימייל</span>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </label>
            <label className="cart-field">
              <span>כתובת</span>
              <input type="text" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </label>
            <label className="cart-field">
              <span>הערות</span>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
            </label>
            {error && <p className="cart-error">{error}</p>}
            <button type="submit" disabled={loading} className="cart-btn cart-btn--primary cart-btn--full">
              {loading ? "שולח..." : "שלח הצעה"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <CartNav />
      <div className="cart-page__inner">
        <Link to="/showroom" className="cart-back-btn">
          <ArrowRight style={{ transform: "rotate(180deg)" }} /> חזרה לתצוגה
        </Link>
        <h1 className="cart-page__title">העגלה שלי <span className="cart-page__count">({cart.length})</span></h1>

        {cart.length === 0 ? (
          <div className="cart-empty">
            <p className="cart-empty__text">הסל ריק</p>
            <Link to="/showroom" className="cart-btn cart-btn--primary">
              לתצוגת הארונות <ArrowRight />
            </Link>
          </div>
        ) : (
          <>
            <ul className="cart-list">
              {cart.map((item) => {
                const snap = item.snapshot;
                const cfg = parseConfig(item.config_json);
                const dims = snap?.customDims ?? cfg.dimensions;
                const doors = cfg.doors ?? [];
                const doorKind = doors.length && doors.every((d) => d.kind === doors[0]?.kind)
                  ? (doors[0].kind === "sliding" ? "הזזה" : "ציר")
                  : doors.length ? "מעורב" : null;
                const widthCm = dims
                  ? Math.round((dims.compartmentWidth ?? 80) * Math.max(1, doors.length))
                  : null;
                const color = snap?.customColor ?? cfg.color;
                const isCustom = !!snap;
                const priceNum = item.displaySalePrice
                  ?? snap?.priceEstimate
                  ?? item.priceEstimate
                  ?? cfg.basePrice;
                const price = priceNum ? `₪${Number(priceNum).toLocaleString()}` : null;
                return (
                  <li key={item.id} className="cart-item">
                    {item.image_path && (
                      <img src={`/uploads/${item.image_path}`} alt={item.name} className="cart-item__image" />
                    )}
                    <div className="cart-item__info">
                      <div className="cart-item__name-row">
                        <span className="cart-item__name">{item.name}</span>
                        {isCustom && <span className="cart-item__badge">מותאם אישית</span>}
                        {item.displaySalePrice && <span className="cart-item__badge cart-item__badge--sale">מתצוגה</span>}
                      </div>
                      {dims && widthCm && (
                        <span className="cart-item__detail">📐 {widthCm} × {dims.H} × {dims.D} ס״מ</span>
                      )}
                      {doors.length > 0 && (
                        <span className="cart-item__detail">🚪 {doors.length} דלתות{doorKind ? ` · ${doorKind}` : ""}</span>
                      )}
                      {color && (
                        <span className="cart-item__detail">🎨 {colorName(color)}</span>
                      )}
                      {price && <span className="cart-item__price">{price}</span>}
                    </div>
                    <button onClick={() => handleRemove(item.id)} className="cart-item__remove" aria-label="הסר">✕</button>
                  </li>
                );
              })}
            </ul>
            <div className="cart-footer">
              <button className="cart-btn cart-btn--primary cart-btn--full" onClick={() => setStep("contact")}>
                המשך להצעת מחיר <ArrowRight />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
