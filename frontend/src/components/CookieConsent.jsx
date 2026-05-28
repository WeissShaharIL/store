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
      <img
        className="cookie-consent__monster"
        src="/cookie-monster.png"
        alt="Cookie Monster"
        aria-hidden="true"
      />
      <div className="cookie-consent__body">
        <p className="cookie-consent__title">מי אוהב עוגיות?! 🍪</p>
        <p className="cookie-consent__text">
          C is for Cookie — גם הדיגיטליות! אתר זה משתמש בעוגיות לשיפור חוויית הגלישה ושמירת ההעדפות שלך.
        </p>
      </div>
      <button type="button" className="cookie-consent__btn" onClick={accept}>
        הבנתי, גם אני אוהב עוגיות
      </button>
    </div>
  );
}
