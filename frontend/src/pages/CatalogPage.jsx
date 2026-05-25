import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header.jsx";
import CustomerNav from "../components/CustomerNav.jsx";
import ItemCard from "../components/ItemCard.jsx";
import PriceBlock from "../components/PriceBlock.jsx";
import { api } from "../api.js";
import { formatILS } from "../lib/money.js";
import {
  FileText, Maximize, Minimize, Image as ImageIcon,
  ShoppingCart, Plus, Minus, X, Check,
} from "../components/Icons.jsx";

const VIEW_MODE_KEY = "demo_catalog_view";

function QuantityStepper({ value, onChange, disabled }) {
  return (
    <div className="qty-stepper">
      <button
        type="button"
        className="qty-stepper__btn"
        onClick={() => onChange(Math.max(0, (value || 0) - 1))}
        disabled={disabled || !value}
        aria-label="הפחת"
      >
        <Minus />
      </button>
      <input
        type="number"
        min="0"
        className="qty-stepper__input"
        value={value || 0}
        onChange={(e) => {
          const n = Math.max(0, parseInt(e.target.value || "0", 10) || 0);
          onChange(n);
        }}
        disabled={disabled}
      />
      <button
        type="button"
        className="qty-stepper__btn"
        onClick={() => onChange((value || 0) + 1)}
        disabled={disabled}
        aria-label="הוסף"
      >
        <Plus />
      </button>
    </div>
  );
}

function CompactRow({ item, ordering, qty, onQty }) {
  return (
    <div className={"compact-row" + (ordering && qty > 0 ? " compact-row--selected" : "")}>
      <div className="compact-row__thumb">
        {item.image_path ? (
          <img src={`/uploads/${item.image_path}`} alt={item.name} />
        ) : (
          <ImageIcon />
        )}
      </div>
      <div className="compact-row__main">
        <div className="compact-row__name">{item.name}</div>
        <div className="compact-row__code muted">קוד: {item.product_code}</div>
      </div>
      <PriceBlock item={item} size="sm" />
      {ordering && (
        <QuantityStepper value={qty} onChange={onQty} />
      )}
    </div>
  );
}

export default function CatalogPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem(VIEW_MODE_KEY) || "compact"
  );
  const [downloading, setDownloading] = useState(false);

  const [ordering, setOrdering] = useState(false);
  const [qtys, setQtys] = useState({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    api.me.catalog()
      .then(setItems)
      .catch((e) => setError(e.message || "שגיאה"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  const byCategory = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const k = it.category || "כללי";
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(it);
    }
    return [...map.entries()];
  }, [items]);

  const itemsById = useMemo(() => {
    const m = new Map();
    for (const it of items) m.set(it.id, it);
    return m;
  }, [items]);

  const cartLines = useMemo(() => {
    const lines = [];
    for (const [id, qty] of Object.entries(qtys)) {
      const n = Number(qty);
      if (!n || n <= 0) continue;
      const it = itemsById.get(Number(id));
      if (!it) continue;
      lines.push({ item: it, quantity: n });
    }
    return lines;
  }, [qtys, itemsById]);

  const cartTotal = useMemo(
    () => cartLines.reduce((s, l) => s + Number(l.item.price) * l.quantity, 0),
    [cartLines]
  );

  const cartCount = cartLines.length;

  function setQty(itemId, n) {
    setQtys((prev) => {
      const next = { ...prev };
      if (!n || n <= 0) delete next[itemId];
      else next[itemId] = n;
      return next;
    });
    if (success) setSuccess("");
  }

  function startOrdering() {
    setOrdering(true);
    setSuccess("");
  }

  function cancelOrdering() {
    setOrdering(false);
    setReviewOpen(false);
    setQtys({});
    setNotes("");
  }

  async function submitOrder() {
    if (cartLines.length === 0) return;
    setSubmitting(true);
    setError("");
    try {
      await api.me.orders.create({
        notes: notes.trim() || null,
        lines: cartLines.map((l) => ({
          item_id: l.item.id,
          quantity: l.quantity,
        })),
      });
      setSuccess("ההזמנה נשלחה!");
      setQtys({});
      setNotes("");
      setOrdering(false);
      setReviewOpen(false);
    } catch (e) {
      setError(e.message || "שגיאה בשליחת ההזמנה");
    } finally {
      setSubmitting(false);
    }
  }

  async function downloadPdf() {
    setDownloading(true);
    setError("");
    try {
      const today = new Date().toISOString().slice(0, 10);
      await api.downloadPdf("/api/me/catalog.pdf", `catalog-${today}.pdf`);
    } catch (e) {
      setError(e.message || "שגיאה");
    } finally {
      setDownloading(false);
    }
  }

  const compact = viewMode === "compact";

  return (
    <div className="page">
      <Header title="הקטלוג שלי" />
      <CustomerNav />
      <main className={"page__main" + (ordering ? " page__main--with-bar" : "")}>
        <div className="page-toolbar">
          <div className="page-toolbar__title">
            <h2>הקטלוג שלי</h2>
            <span className="muted">{items.length} פריטים</span>
          </div>
          <div className="page-toolbar__actions">
            {!ordering ? (
              <button
                className="btn"
                onClick={startOrdering}
                disabled={items.length === 0}
              >
                <ShoppingCart /> צור הזמנה
              </button>
            ) : (
              <button className="btn btn--ghost" onClick={cancelOrdering}>
                <X /> בטל הזמנה
              </button>
            )}
            <button
              className="icon-btn"
              onClick={() => setViewMode(compact ? "grid" : "compact")}
              title={compact ? "תצוגה מורחבת" : "תצוגה מצומצמת"}
            >
              {compact ? <Maximize /> : <Minimize />}
            </button>
            <button
              className="btn btn--ghost"
              onClick={downloadPdf}
              disabled={downloading || items.length === 0}
            >
              <FileText /> {downloading ? "מוריד…" : "הורד PDF"}
            </button>
          </div>
        </div>

        {loading && <div className="muted">טוען…</div>}
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
        {!loading && !error && items.length === 0 && (
          <div className="empty-state">
            <p>אין פריטים זמינים כרגע.</p>
          </div>
        )}
        {byCategory.map(([cat, list]) => (
          <section key={cat} className="category">
            <h2 className="category__title">{cat}</h2>
            {compact ? (
              <div className="compact-list">
                {list.map((item) => (
                  <CompactRow
                    key={item.id}
                    item={item}
                    ordering={ordering}
                    qty={qtys[item.id] || 0}
                    onQty={(n) => setQty(item.id, n)}
                  />
                ))}
              </div>
            ) : (
              <div className="grid">
                {list.map((item) => (
                  <ItemCard key={item.id} item={item}>
                    {ordering && (
                      <div className="item-card__qty">
                        <QuantityStepper
                          value={qtys[item.id] || 0}
                          onChange={(n) => setQty(item.id, n)}
                        />
                      </div>
                    )}
                  </ItemCard>
                ))}
              </div>
            )}
          </section>
        ))}
      </main>

      {ordering && (
        <div className="order-bar">
          <div className="order-bar__summary">
            <ShoppingCart />
            <span>
              {cartCount > 0
                ? `${cartCount} פריטים · ${formatILS(cartTotal)}`
                : "טרם נבחרו פריטים"}
            </span>
          </div>
          <button
            className="btn btn--primary"
            onClick={() => setReviewOpen(true)}
            disabled={cartLines.length === 0}
          >
            המשך לסיכום
          </button>
        </div>
      )}

      {reviewOpen && (
        <div className="modal-backdrop" onClick={() => setReviewOpen(false)}>
          <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3>סיכום הזמנה</h3>
              <button
                className="icon-btn"
                onClick={() => setReviewOpen(false)}
                aria-label="סגור"
              >
                <X />
              </button>
            </div>
            {cartLines.length === 0 ? (
              <p className="muted">אין פריטים בעגלה.</p>
            ) : (
              <>
                <div className="order-summary">
                  {cartLines.map((l) => (
                    <div key={l.item.id} className="order-summary__row">
                      <div className="order-summary__name">
                        <div>{l.item.name}</div>
                        <div className="muted">קוד: {l.item.product_code}</div>
                      </div>
                      <QuantityStepper
                        value={l.quantity}
                        onChange={(n) => setQty(l.item.id, n)}
                      />
                      <div className="order-summary__price">
                        {formatILS(Number(l.item.price) * l.quantity)}
                      </div>
                    </div>
                  ))}
                  <div className="order-summary__total">
                    <span>סך הכל</span>
                    <span>{formatILS(cartTotal)}</span>
                  </div>
                </div>
                <label className="field">
                  <span>הערות (אופציונלי)</span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="כתובת אספקה, העדפות מסירה וכו'"
                  />
                </label>
                {error && <div className="error">{error}</div>}
                <div className="modal__footer">
                  <button
                    className="btn btn--ghost"
                    onClick={() => setReviewOpen(false)}
                    disabled={submitting}
                  >
                    חזור
                  </button>
                  <button
                    className="btn btn--primary"
                    onClick={submitOrder}
                    disabled={submitting || cartLines.length === 0}
                  >
                    <Check /> {submitting ? "שולח…" : "שלח הזמנה"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
