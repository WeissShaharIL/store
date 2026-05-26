import { useEffect, useState } from "react";
import { X } from "../components/Icons.jsx";
import { submitLead } from "../api.js";
import "../styles/showroom/04-inquiry.css";

export default function InquiryModal({ item, onClose }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await submitLead({
        name: name.trim(),
        phone: phone.trim(),
        notes: `[דגם: ${item.name}]${message.trim() ? "\n" + message.trim() : ""}`,
        cart: [],
      });
      setSent(true);
    } catch (err) {
      setError(err.message || "שגיאה בשליחה");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="inquiry-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={`פנייה לגבי ${item.name}`}>
      <div className="inquiry-card" onClick={(e) => e.stopPropagation()}>
        <div className="inquiry-header">
          <h3 className="inquiry-title">פנייה לגבי: {item.name}</h3>
          <button type="button" className="inquiry-close" onClick={onClose} aria-label="סגור" title="סגור (Esc)">
            <X />
          </button>
        </div>

        {sent ? (
          <div className="inquiry-success">
            <p>תודה! פנייתך התקבלה ונחזור אליך בהקדם.</p>
            <button type="button" className="inquiry-done-btn" onClick={onClose}>סגור</button>
          </div>
        ) : (
          <form className="inquiry-form" onSubmit={handleSubmit}>
            <div className="inquiry-field">
              <label className="inquiry-label">שם מלא *</label>
              <input
                className="inquiry-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                placeholder="ישראל ישראלי"
              />
            </div>
            <div className="inquiry-field">
              <label className="inquiry-label">טלפון *</label>
              <input
                className="inquiry-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="050-0000000"
              />
            </div>
            <div className="inquiry-field">
              <label className="inquiry-label">הודעה</label>
              <textarea
                className="inquiry-input inquiry-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="רשום כאן כל שאלה או בקשה…"
              />
            </div>
            {error && <p className="inquiry-error">{error}</p>}
            <div className="inquiry-footer">
              <button type="button" className="inquiry-cancel" onClick={onClose}>ביטול</button>
              <button
                type="submit"
                className="inquiry-submit"
                disabled={submitting || !name.trim() || !phone.trim()}
              >
                {submitting ? "שולח…" : "שלח פנייה"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
