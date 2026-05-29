import { useState } from "react";
import { X } from "./Icons.jsx";

const CONSENT_KEY = "forma_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(() => {
    try { return !localStorage.getItem(CONSENT_KEY); } catch { return false; }
  });

  if (!visible) return null;

  function dismiss() {
    try { localStorage.setItem(CONSENT_KEY, "1"); } catch { /* ignore */ }
    setVisible(false);
  }

  return (
    <div className="cookie-bar" role="region" aria-label="הסכמה לשימוש בנתונים">
      <div className="cookie-bar__inner">
        <div className="cookie-bar__content">
          <button type="button" className="cookie-bar__close" onClick={dismiss} aria-label="סגור">
            <X />
          </button>
          <p className="cookie-bar__text">
            אתר זה משתמש בעוגיות לשיפור חוויית הגלישה שלך.
          </p>
        </div>
        <button type="button" className="cookie-bar__accept" onClick={dismiss}>
          אישור
        </button>
      </div>
    </div>
  );
}
