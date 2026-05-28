import { useState } from "react";

const CONSENT_KEY = "forma_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(() => {
    try {
      return !localStorage.getItem(CONSENT_KEY);
    } catch {
      return false;
    }
  });

  if (!visible) return null;

  function accept() {
    try { localStorage.setItem(CONSENT_KEY, "1"); } catch { /* ignore */ }
    setVisible(false);
  }

  return (
    <div className="cookie-consent" role="region" aria-label="הסכמה לשימוש בנתונים">
      <p className="cookie-consent__text">
        <strong>הודעת שימוש בנתונים מקומיים:</strong>{" "}
        אתר זה שומר נתוני עיצוב וסל קניות בזיכרון המקומי של הדפדפן שלך
        (localStorage / sessionStorage) לצורך שיפור חוויית העיצוב האישית.
        המידע אינו נשלח לשרת ואינו משותף עם צדדים שלישיים.
      </p>
      <button type="button" className="cookie-consent__btn" onClick={accept}>
        אני מסכים ✓
      </button>
    </div>
  );
}
