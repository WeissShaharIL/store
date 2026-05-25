import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { submitLead } from "../api.js";
import { clearCart, getCart, removeFromCart, subscribeToCart } from "../lib/cart.js";
import "./CartPage.css";

export default function CartPage() {
  const [cart, setCart] = useState(getCart());
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [step, setStep] = useState("cart"); // "cart" | "contact" | "done"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

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
          config: item.config,
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
        <div className="cart-done">
          <div className="cart-done-icon">✓</div>
          <h2>תודה! קיבלנו את הפנייה שלך</h2>
          <p>ניצור קשר בהקדם עם הצעת מחיר.</p>
          <Link to="/" className="btn-back">חזרה לדף הבית</Link>
        </div>
      </div>
    );
  }

  if (step === "contact") {
    return (
      <div className="cart-page">
        <header className="cart-header">
          <button onClick={() => setStep("cart")} className="cart-back-btn">← חזרה לסל</button>
          <h1>פרטי קשר</h1>
        </header>
        <form onSubmit={handleSubmit} className="contact-form">
          <label>
            שם מלא *
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>
          <label>
            טלפון *
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              required
            />
          </label>
          <label>
            אימייל
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </label>
          <label>
            כתובת
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </label>
          <label>
            הערות
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" disabled={loading} className="cart-submit-btn">
            {loading ? "שולח..." : "שלח הצעה"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <header className="cart-header">
        <Link to="/showroom" className="cart-back-btn">← חזרה לתצוגה</Link>
        <h1>סל הצעות ({cart.length})</h1>
      </header>

      {cart.length === 0 ? (
        <div className="cart-empty">
          <p>הסל ריק</p>
          <Link to="/showroom" className="btn-to-showroom">לתצוגת הארונות</Link>
        </div>
      ) : (
        <>
          <ul className="cart-list">
            {cart.map((item) => (
              <li key={item.id} className="cart-item">
                {item.image_path && (
                  <img
                    src={`/uploads/${item.image_path}`}
                    alt={item.name}
                    className="cart-item-image"
                  />
                )}
                <div className="cart-item-info">
                  <span className="cart-item-name">{item.name}</span>
                  {item.displaySalePrice && (
                    <span className="cart-item-price">{item.displaySalePrice}</span>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="cart-item-remove"
                  aria-label="הסר"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className="cart-footer">
            <button className="cart-checkout-btn" onClick={() => setStep("contact")}>
              המשך להצעת מחיר
            </button>
          </div>
        </>
      )}
    </div>
  );
}
