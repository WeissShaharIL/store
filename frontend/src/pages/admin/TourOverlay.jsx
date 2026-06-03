import { useEffect, useRef, useState } from "react";
import "./TourOverlay.css";

const PAD = 10; // spotlight padding around the target element

export const TOUR_STEPS = [
  {
    tab: "settings",
    selector: ".admin-tabs",
    title: "ברוך הבא ללוח הניהול",
    body: "זהו לוח הניהול של החנות. הלשוניות בחלק העליון מחלקות את הממשק לאזורים שונים. בואו נסייר ביחד.",
  },
  {
    tab: "settings",
    selector: ".settings-section",
    title: "הגדרות",
    body: "כאן תוכל לשנות סיסמה, לנהל את לוגו האתר, ולהפעיל את הסיור המודרך הזה בכל עת.",
  },
  {
    tab: "landing",
    selector: ".admin-tab-content",
    title: "דף הבית",
    body: "שלוט בתוכן דף הבית: תמונות רקע, כותרות, טקסט אודות, טלפון ומספר WhatsApp.",
  },
  {
    tab: "images",
    selector: ".admin-tab-content",
    title: "תמונות",
    body: "ספריית המדיה של האתר. העלה תמונות, ארגן לתיקיות, והשתמש בהן בכל מקום.",
  },
  {
    tab: "leads",
    selector: ".admin-tab-content",
    title: "פניות",
    body: "כל פנייה שלקוח שלח מהאתר מגיעה לכאן. ניתן לסמן כנקראה, לרשום הערות, ולהמיר להזמנה.",
  },
  {
    tab: "orders",
    selector: ".admin-tab-content",
    title: "הזמנות",
    body: "הזמנות שנוצרו מפניות לקוחות. עקוב אחר הסטטוס לאורך תהליך הייצור.",
  },
  {
    tab: "activity",
    selector: ".admin-tab-content",
    title: "פעילות",
    body: "לוג מלא של כל פעולות המנהל — מי שינה מה ומתי. שימושי לביקורת ומעקב.",
  },
  {
    tab: "pituch",
    subTab: "builder",
    selector: ".pituch-tab__nav",
    title: "פיתוח ארונות",
    body: "הלשונית הזו היא הלב הטכני. היא מכילה כלים לבניית קטלוג הארונות, ניהול צבעים, ידיות ותמחור.",
  },
  {
    tab: "pituch",
    subTab: "builder",
    selector: ".closet-builder__toolbar",
    title: "בונה ארונות",
    body: "צור תבניות ארון חדשות: הגדר מידות, מספר דלתות, סוג דלתות, ידיות וצבעים. שמור ופרסם ללקוחות.",
  },
  {
    tab: "pituch",
    subTab: "gallery",
    selector: ".admin-tab-content",
    title: "גלריה",
    body: "צפה בכל תבניות הארונות. שנה סטטוס מטיוטה למוכן, ערוך, מחק, וסמן כ\"מתצוגה\".",
  },
  {
    tab: "pituch",
    subTab: "colors",
    selector: ".admin-tab-content",
    title: "צבעים",
    body: "נהל את פלטת הצבעים הזמינה ללקוחות בעת עיצוב הארון. הוסף, ערוך וסדר.",
  },
  {
    tab: "pituch",
    subTab: "handles",
    selector: ".admin-tab-content",
    title: "ידיות",
    body: "קטלוג ידיות הדלתות. הוסף ידיות חדשות עם תמונה, שם וסוג דלת מתאים.",
  },
  {
    tab: "pituch",
    subTab: "prices",
    selector: ".admin-tab-content",
    title: "תוספות ארון",
    body: "הגדר רכיבים (מדף, מוט, מגירה) עם מחיר קבוע או לפי מידה. אלה יופיעו ללקוח כתוספות.",
  },
  {
    tab: "pituch",
    subTab: "custom",
    selector: ".admin-tab-content",
    title: "ארון בהתאמה אישית",
    body: "הגדרות גלובליות לתכונת הארון המותאם: מידות מינימום ומקסימום, סוגי דלתות, ופריטים פנימיים מותרים.",
  },
  {
    tab: "settings",
    selector: "#tour-section",
    title: "סיום — עכשיו אתה בקיא!",
    body: "עברת על כל חלקי לוח הניהול. תמיד אפשר להפעיל שוב את הסיור מלשונית הגדרות. בהצלחה!",
  },
];

export default function TourOverlay({ activeTab, setActiveTab, setPituchSubTab, onClose }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [spotRect, setSpotRect] = useState(null);
  const timerRef = useRef(null);

  const step = TOUR_STEPS[stepIdx];
  const total = TOUR_STEPS.length;

  // When step changes — switch tabs then find the element
  useEffect(() => {
    if (!step) return;
    clearTimeout(timerRef.current);

    if (step.tab) setActiveTab(step.tab);
    if (step.subTab) setPituchSubTab(step.subTab);

    // Wait for the tab switch to render before querying the DOM
    let attempts = 0;
    function tryFind() {
      const el = document.querySelector(step.selector);
      if (el) {
        const r = el.getBoundingClientRect();
        setSpotRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
      } else if (attempts < 12) {
        attempts++;
        timerRef.current = setTimeout(tryFind, 150);
      } else {
        setSpotRect(null);
      }
    }
    timerRef.current = setTimeout(tryFind, 250);
    return () => clearTimeout(timerRef.current);
  }, [stepIdx]); // eslint-disable-line

  function goNext() {
    if (stepIdx < total - 1) setStepIdx((i) => i + 1);
    else onClose();
  }
  function goPrev() {
    if (stepIdx > 0) setStepIdx((i) => i - 1);
  }

  if (!step) return null;

  // Position the tooltip card near the spotlight
  const CARD_W = 360;
  const CARD_H = 200;
  const cardStyle = {};
  if (spotRect) {
    const spaceBelow = window.innerHeight - (spotRect.top + spotRect.height + PAD);
    const spaceAbove = spotRect.top - PAD;
    if (spaceBelow >= CARD_H || spaceBelow >= spaceAbove) {
      cardStyle.top = Math.min(spotRect.top + spotRect.height + 14, window.innerHeight - CARD_H - 16);
    } else {
      cardStyle.top = Math.max(16, spotRect.top - CARD_H - 14);
    }
    const centerX = spotRect.left + spotRect.width / 2;
    cardStyle.left = Math.max(16, Math.min(centerX - CARD_W / 2, window.innerWidth - CARD_W - 16));
  } else {
    cardStyle.top = "50%";
    cardStyle.left = "50%";
    cardStyle.transform = "translate(-50%, -50%)";
  }

  return (
    <>
      {spotRect ? (
        <div
          className="tour-spotlight"
          style={{ top: spotRect.top, left: spotRect.left, width: spotRect.width, height: spotRect.height }}
        />
      ) : (
        <div className="tour-backdrop" />
      )}

      <div className="tour-card" style={cardStyle}>
        <div className="tour-card__header">
          <span className="tour-card__counter">{stepIdx + 1} / {total}</span>
          <button className="tour-card__close" onClick={onClose} aria-label="סגור סיור">✕</button>
        </div>
        <h3 className="tour-card__title">{step.title}</h3>
        <p className="tour-card__body">{step.body}</p>
        <div className="tour-card__actions">
          <button className="tour-btn tour-btn--ghost" onClick={goPrev} disabled={stepIdx === 0}>הקודם</button>
          <div className="tour-dots">
            {TOUR_STEPS.map((_, i) => (
              <span key={i} className={"tour-dot" + (i === stepIdx ? " tour-dot--active" : "")} />
            ))}
          </div>
          <button className="tour-btn tour-btn--primary" onClick={goNext}>
            {stepIdx === total - 1 ? "סיים" : "הבא"}
          </button>
        </div>
      </div>
    </>
  );
}
