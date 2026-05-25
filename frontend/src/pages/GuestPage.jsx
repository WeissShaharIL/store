import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { useForceLightTheme } from "../contexts/ThemeContext.jsx";
import Section from "../components/Section.jsx";
import {
  Check, Mail, Maximize, Minimize, Package,
  Send, Image as ImageIcon,
} from "../components/Icons.jsx";

const VIEW_MODE_KEY = "demo_guest_view";

function CompactRow({ item }) {
  return (
    <div className="compact-row">
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
    </div>
  );
}

function CardRow({ item }) {
  return (
    <div className="item-card">
      <div className="item-card__image">
        {item.image_path ? (
          <img src={`/uploads/${item.image_path}`} alt={item.name} />
        ) : (
          <div className="item-card__placeholder">
            <ImageIcon />
            <span>אין תמונה</span>
          </div>
        )}
      </div>
      <div className="item-card__body">
        <div className="item-card__name">{item.name}</div>
        <div className="item-card__code">קוד: {item.product_code}</div>
        {item.description && <div className="item-card__desc">{item.description}</div>}
      </div>
    </div>
  );
}

export default function GuestPage() {
  useForceLightTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem(VIEW_MODE_KEY) || "compact"
  );

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [contactErr, setContactErr] = useState("");

  useEffect(() => {
    api.public.catalog()
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

  async function handleContact(e) {
    e.preventDefault();
    setSending(true);
    setContactErr("");
    try {
      await api.public.contact({
        name: name.trim(),
        contact: contact.trim(),
        body: body.trim(),
      });
      setSent(true);
      setName("");
      setContact("");
      setBody("");
      setTimeout(() => setSent(false), 4000);
    } catch (e) {
      setContactErr(e.message || "שגיאה");
    } finally {
      setSending(false);
    }
  }

  const compact = viewMode === "compact";

  return (
    <div className="page">
      <header className="app-header">
        <div className="app-header__brand">
          <div className="app-header__mark" aria-label="Simple">SIMPLE</div>
          <div className="app-header__title">קטלוג לקוחות</div>
        </div>
        <div className="app-header__right"></div>
      </header>

      <main className="page__main">
        <Section
          title="השאירו פרטים ונחזור אליכם"
          subtitle="ספרו לנו איך לתפוס אתכם ונציג ייצור איתכם קשר"
          icon={<Mail />}
          defaultOpen
        >
          <form className="form-grid" onSubmit={handleContact} autoComplete="off">
            <label className="field">
              <span>שם</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={128}
              />
            </label>
            <label className="field">
              <span>טלפון או מייל</span>
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                required
                maxLength={128}
                placeholder="054-... או name@example.com"
              />
            </label>
            <label className="field field--full">
              <span>הודעה</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                maxLength={2000}
                rows={3}
                placeholder="במה אנחנו יכולים לעזור?"
              />
            </label>
            {contactErr && <div className="error field--full">{contactErr}</div>}
            <div className="form-grid__actions">
              <button
                className="btn btn--primary"
                type="submit"
                disabled={sending || sent}
              >
                <Send /> {sending ? "שולח…" : sent ? "נשלח" : "שלח הודעה"}
              </button>
              {sent && (
                <span className="success-inline">
                  <Check /> ההודעה נשלחה, נחזור אליכם בקרוב
                </span>
              )}
            </div>
          </form>
        </Section>

        <div className="page-toolbar">
          <div className="page-toolbar__title">
            <h2>קטלוג</h2>
            <span className="muted">{items.length} פריטים</span>
          </div>
          <div className="page-toolbar__actions">
            <button
              className="icon-btn"
              onClick={() => setViewMode(compact ? "grid" : "compact")}
              title={compact ? "תצוגה מורחבת" : "תצוגה מצומצמת"}
            >
              {compact ? <Maximize /> : <Minimize />}
            </button>
          </div>
        </div>

        {loading && <div className="muted">טוען…</div>}
        {error && <div className="error">{error}</div>}
        {!loading && !error && items.length === 0 && (
          <div className="empty-state">
            <Package />
            <p>אין פריטים זמינים כרגע.</p>
          </div>
        )}
        {byCategory.map(([cat, list]) => (
          <section key={cat} className="category">
            <h2 className="category__title">{cat}</h2>
            {compact ? (
              <div className="compact-list">
                {list.map((item) => (
                  <CompactRow key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="grid">
                {list.map((item) => (
                  <CardRow key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>
        ))}
      </main>
    </div>
  );
}
