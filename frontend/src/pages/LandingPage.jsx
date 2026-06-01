import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getActiveLogo, getDoorTypeCovers, getPublicClosets, getPublicHeroBanners, getPublicSettings, submitLead } from "../api.js";
import CartIcon from "../components/CartIcon.jsx";
import FormaLogo from "../components/FormaLogo.jsx";
import { ArrowRight, Check, Send } from "../components/Icons.jsx";

const ShowroomClosetDetails = lazy(() => import("./ShowroomClosetDetails.jsx"));
// Named import fns so we can PRELOAD these heavy chunks (ScratchStart pulls in
// ClosetDesigner → three.js). Without preloading, the first click blanks for
// ~2s while the chunk downloads behind a null Suspense fallback.
const importScratchStart = () => import("./ScratchStart.jsx");
const importClosetDesigner = () => import("./ClosetDesigner.jsx");
const ScratchStart = lazy(importScratchStart);

// Visible Suspense fallback so a not-yet-loaded chunk shows a spinner instead
// of a blank flash.
function DesignerLoading() {
  return (
    <div className="designer-loading" role="status" aria-label="טוען…">
      <div className="designer-loading__spinner" />
    </div>
  );
}
import { addToCart, getCart } from "../lib/cart.js";
import "../styles/landing/01-shell-nav.css";
import "../styles/showroom/03-details.css";
import "../styles/landing/02-hero.css";
import "../styles/landing/03-categories.css";
import "../styles/landing/04-gallery.css";
import "../styles/landing/05-contact.css";
import "../styles/landing/06-footer.css";
import "../styles/landing/07-whatsapp.css";
import "../styles/landing/08-closet-anim.css";
import "../styles/landing/09-scroll-fx.css";

const DEFAULTS = {
  welcome_title: "ארונות בהתאמה אישית",
  welcome_subtitle: "ייצור עצמי, אחריות מלאה, התאמה לכל חדר",
  hero_tagline: "עיצוב, בנייה ומסירה עד הבית",
  about_text: "אנחנו מתמחים בייצור ארונות איכות מהחומרים הטובים ביותר, עם שירות מלא מהמדידה ועד ההרכבה.",
  contact_phone: "",
  contact_whatsapp: "",
};

const TRUST_DEFAULTS = [
  { title: "ייצור עצמי", body: "שליטה מלאה על האיכות" },
  { title: "אחריות 5 שנים", body: "על כל המוצרים שלנו" },
  { title: "התקנה מקצועית", body: "צוות מנוסה בשטח" },
  { title: "התאמה אישית", body: "לכל גודל ועיצוב" },
];

export default function LandingPage() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [settingsResolved, setSettingsResolved] = useState(false);
  const [logo, setLogo] = useState(null);
  const [closets, setClosets] = useState([]);
  const [banners, setBanners] = useState([]);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [doorCovers, setDoorCovers] = useState({});
  const [selectedCloset, setSelectedCloset] = useState(null);
  const [scratchOpen, setScratchOpen] = useState(false);
  const [addedIds, setAddedIds] = useState(() =>
    new Set(getCart().map((i) => i.templateId))
  );

  function handleAddToCart(closet) {
    const id = "closet-" + closet.id + "-" + Date.now();
    addToCart({ id, templateId: closet.id, name: closet.name, image_path: closet.image_path, config_json: closet.config_json });
    setAddedIds((prev) => new Set([...prev, closet.id]));
  }

  useEffect(() => {
    let alive = true;
    getPublicSettings()
      .then((data) => { if (alive && data) setSettings({ ...DEFAULTS, ...data }); })
      .catch(() => {})
      .finally(() => { if (alive) setSettingsResolved(true); });
    getActiveLogo().then((l) => { if (alive) setLogo(l); }).catch(() => {});
    getPublicClosets()
      .then((rows) => { if (alive) setClosets(rows || []); })
      .catch(() => {});
    getPublicHeroBanners()
      .then((rows) => { if (alive) setBanners(rows || []); })
      .catch(() => {});
    getDoorTypeCovers()
      .then((rows) => {
        if (!alive) return;
        const map = {};
        for (const c of (rows || [])) map[c.kind] = c.image_path;
        setDoorCovers(map);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (banners.length < 2) return;
    const id = setInterval(() => setBannerIdx((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(id);
  }, [banners.length]);

  // Warm the from-scratch designer chunks while the browser is idle so the
  // first "התחילו לעצב" click opens instantly instead of waiting ~2s for the
  // download. Vite dedupes, so calling these again on hover/click is free.
  useEffect(() => {
    let cancelled = false;
    const preload = () => {
      if (cancelled) return;
      importScratchStart();
      importClosetDesigner();
    };
    const ric = typeof window !== "undefined" && window.requestIdleCallback;
    const id = ric ? ric(preload, { timeout: 2500 }) : setTimeout(preload, 1500);
    return () => {
      cancelled = true;
      if (ric && window.cancelIdleCallback) window.cancelIdleCallback(id);
      else clearTimeout(id);
    };
  }, []);

  const defaultClosetImage = settings.default_closet_image || null;

  const trustItems = useMemo(() => {
    try {
      const parsed = JSON.parse(settings.trust_items || "[]");
      return Array.isArray(parsed) && parsed.length ? parsed : TRUST_DEFAULTS;
    } catch { return TRUST_DEFAULTS; }
  }, [settings.trust_items]);

  const galleryItems = useMemo(
    () => closets.filter((c) => c.image_path || defaultClosetImage).slice(0, 6),
    [closets, defaultClosetImage],
  );

  const slidingSlides = useMemo(
    () => closets
      .filter((c) => {
        if (!c.image_path) return false;
        try {
          const cfg = JSON.parse(c.config_json || "{}");
          return (cfg.kind || cfg.doors?.[0]?.kind) === "sliding";
        }
        catch { return false; }
      })
      .map((c) => c.image_path),
    [closets],
  );
  const hingedSlides = useMemo(
    () => closets
      .filter((c) => {
        if (!c.image_path) return false;
        try {
          const cfg = JSON.parse(c.config_json || "{}");
          return (cfg.kind || cfg.doors?.[0]?.kind) === "hinged";
        }
        catch { return false; }
      })
      .map((c) => c.image_path),
    [closets],
  );

const contactRef = useRef(null);
  const sentTimerRef = useRef(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [contactErr, setContactErr] = useState("");
  useEffect(() => () => clearTimeout(sentTimerRef.current), []);

  function scrollToContact(e) {
    e.preventDefault();
    contactRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleContact(e) {
    e.preventDefault();
    setSending(true);
    setContactErr("");
    try {
      await submitLead({
        name: name.trim(),
        phone: phone.trim(),
        notes: body.trim(),
        cart_items: [],
      });
      setSent(true);
      setName(""); setPhone(""); setBody("");
      sentTimerRef.current = setTimeout(() => setSent(false), 5000);
    } catch (err) {
      setContactErr(err.message || "שגיאה");
    } finally {
      setSending(false);
    }
  }

  const whatsapp = (settings.contact_whatsapp || "").trim();
  const whatsappHref = whatsapp
    ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`
    : null;

  const heroSrc = settings.hero_image ? `/uploads/${settings.hero_image}` : null;
  const brandName = settings.brand_name || "Forma";

  return (
    <div className="landing">
      <Suspense fallback={null}>
        {selectedCloset && (
          <ShowroomClosetDetails
            item={selectedCloset}
            onClose={() => setSelectedCloset(null)}
            onAddToCart={(closet) => { handleAddToCart(closet); }}
            added={addedIds.has(selectedCloset.id)}
          />
        )}
      </Suspense>
      <Suspense fallback={<DesignerLoading />}>
        {scratchOpen && <ScratchStart onClose={() => setScratchOpen(false)} />}
      </Suspense>
      <header className="landing-nav">
        <div className="landing-nav__inner">
          <Link to="/" className="landing-nav__brand" aria-label={brandName}>
            {logo ? (
              <img src={`/uploads/${logo.image_path}`} alt={brandName} className="landing-nav__brand-logo" />
            ) : (
              <FormaLogo />
            )}
          </Link>

          <nav className="landing-nav__links" aria-label="ניווט ראשי">
            <a href="#categories">קטגוריות</a>
            <a href="#gallery">גלריה</a>
            <Link to="/display-sale">מכירה מתצוגה</Link>
            <a href="#about">אודות</a>
            <a href="#contact" onClick={scrollToContact}>צרו קשר</a>
          </nav>

          <div className="landing-nav__right">
            <CartIcon />
          </div>
        </div>
      </header>

      <main>
        <section
          data-scroll-section
          className={
            "landing-scroll-section landing-hero " +
            (!settingsResolved
              ? "landing-hero--loading"
              : heroSrc
              ? "landing-hero--photo"
              : "landing-hero--placeholder")
          }
        >
          <div className="landing-hero__media" aria-hidden="true">
            {banners.length > 0 ? (
              banners.map((b, i) => (
                <img
                  key={b.id}
                  src={`/uploads/${b.image_path}`}
                  alt=""
                  className={`landing-hero__slide${i === bannerIdx ? " landing-hero__slide--active" : ""}`}
                />
              ))
            ) : heroSrc ? (
              <img src={heroSrc} alt="" className="landing-hero__slide landing-hero__slide--active" />
            ) : settingsResolved ? (
              <div className="landing-hero__panel">
                <div className="landing-hero__door landing-hero__door--a" />
                <div className="landing-hero__door landing-hero__door--b" />
                <div className="landing-hero__door landing-hero__door--c" />
                <div className="landing-hero__handle landing-hero__handle--a" />
                <div className="landing-hero__handle landing-hero__handle--b" />
                <div className="landing-hero__handle landing-hero__handle--c" />
              </div>
            ) : null}
            <div className="landing-hero__scrim" />
          </div>

          <div className="landing-hero__copy">
            <p className="landing-hero__eyebrow">ייצור ישראלי מקצועי</p>
            <RippleTitle text={settings.welcome_title} className="landing-hero__title" />
            <p className="landing-hero__sub">{settings.hero_tagline || settings.welcome_subtitle}</p>
          </div>
        </section>

        <section id="categories" data-scroll-section className="landing-scroll-section landing-section landing-categories">
          <header className="landing-section__head">
            <h2 className="landing-section__title">הארונות שלנו</h2>
            <p className="landing-section__sub">בחרו מדגם מוכן או עצבו ארון בדיוק לפי הצורך שלכם</p>
          </header>
          <div className="landing-category-grid">
            <CategoryCard
              variant="sliding"
              title="דלתות הזזה"
              body="ארונות עם דלתות מסילה — חיסכון במקום, נראות נקייה ומודרנית."
              ctaLabel="לדגמי הזזה"
              to="/showroom?kind=sliding"
              image={doorCovers.sliding ? `/uploads/${doorCovers.sliding}` : undefined}
              slides={slidingSlides}
            />
            <CategoryCard
              variant="hinged"
              title="דלתות פתיחה"
              body="ארונות עם דלתות צירים — גישה מלאה לתוכן, מגוון עיצובים."
              ctaLabel="לדגמי פתיחה"
              to="/showroom?kind=hinged"
              image={doorCovers.hinged ? `/uploads/${doorCovers.hinged}` : undefined}
              slides={hingedSlides}
            />
            {/* "Design your own" as a third category card (relocated from the
               hero CTA band) — opens the from-scratch designer, same action as
               before. Grid now reads: הזזה · פתיחה · עצבו ארון משלכם. */}
            <article className="landing-category-card landing-category-card--design">
              <div className="design-preview-anim" aria-hidden="true">
                <div className="dpa__closet">
                  {/* Left panel */}
                  <div className="dpa__panel dpa__panel--l">
                    <div className="dpa__shelf dpa__shelf--1" />
                    <div className="dpa__shelf dpa__shelf--2" />
                    <div className="dpa__shelf dpa__shelf--3" />
                    <div className="dpa__color-bg" />
                    <div className="dpa__door dpa__door--l" />
                  </div>
                  <div className="dpa__divider" />
                  {/* Right panel */}
                  <div className="dpa__panel dpa__panel--r">
                    <div className="dpa__rod" />
                    <div className="dpa__door dpa__door--r" />
                  </div>
                </div>
                <div className="dpa__palette">
                  <div className="dpa__dot dpa__dot--1" />
                  <div className="dpa__dot dpa__dot--2" />
                  <div className="dpa__dot dpa__dot--3" />
                  <div className="dpa__dot dpa__dot--4" />
                </div>
              </div>
              <h3>עצבו ארון משלכם</h3>
              <p>בנו ארון מאפס בכלי העיצוב התלת-ממדי — מידות, דלתות, צבעים ופנים, בדיוק כרצונכם.</p>
              <button
                type="button"
                className="landing-category-card__cta"
                onPointerEnter={() => { importScratchStart(); importClosetDesigner(); }}
                onClick={() => setScratchOpen(true)}
              >
                התחילו לעצב <span className="cta-arrow"><ArrowRight /></span>
              </button>
            </article>
          </div>
        </section>

        <section data-scroll-section className="landing-scroll-section landing-trust" aria-label="יתרונות">
          <ul className="landing-trust__list">
            {trustItems.map((t, i) => (
              <li key={i}>
                <Check />
                <div>
                  <strong>{t.title}</strong>
                  <span>{t.body}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {galleryItems.length > 0 && (
          <section id="gallery" data-scroll-section className="landing-scroll-section landing-gallery">
            <header className="landing-section__head">
              <h2 className="landing-section__title">הנמכרים ביותר</h2>
              <p className="landing-section__sub">דגמים נבחרים מהקטלוג שלנו.</p>
            </header>
            <div className="landing-gallery__grid">
              {galleryItems.map((c) => (
                <figure
                  key={c.id}
                  className="landing-gallery__card"
                  onClick={() => setSelectedCloset(c)}
                  style={{ cursor: "pointer" }}
                >
                  <img src={`/uploads/${c.image_path || defaultClosetImage}`} alt={c.name} loading="lazy" />
                  <figcaption>{c.name}</figcaption>
                </figure>
              ))}
            </div>
            <div className="landing-gallery__cta-row">
              <Link to="/showroom" className="btn btn--primary">
                לכל הדגמים
              </Link>
            </div>
          </section>
        )}

        {settings.about_text && (
          <section id="about" data-scroll-section className="landing-scroll-section landing-section landing-about">
            <div className="landing-about__inner">
              <header className="landing-section__head">
                <h2 className="landing-section__title">אודות</h2>
              </header>
              <p>{settings.about_text}</p>
            </div>
          </section>
        )}

        <section id="contact" ref={contactRef} data-scroll-section className="landing-scroll-section landing-section landing-contact">
          <div className="landing-contact__inner">
            <header className="landing-section__head">
              <h2 className="landing-section__title">צרו קשר</h2>
              <p className="landing-section__sub">נשמח לענות על כל שאלה ולקבוע פגישת ייעוץ.</p>
            </header>

            <form className="landing-contact__form" onSubmit={handleContact} autoComplete="off">
              <label className="field">
                <span>שם</span>
                <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={128} />
              </label>
              <label className="field">
                <span>טלפון</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} required maxLength={20} type="tel" />
              </label>
              <label className="field">
                <span>הודעה</span>
                <textarea
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={2000}
                />
              </label>

              {contactErr && <div className="error">{contactErr}</div>}
              {sent && (
                <div className="success-inline">
                  <Check /> תודה! קיבלנו את הפנייה ונחזור אליכם בקרוב.
                </div>
              )}

              <button type="submit" className="btn btn--primary btn--block" disabled={sending}>
                {sending ? "שולח…" : <><Send /> שליחה</>}
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer__inner">
          <div className="landing-footer__brand">
            <FormaLogo style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px" }} />
          </div>
          <p className="landing-footer__copy">
            © {new Date().getFullYear()} {brandName} ארונות. כל הזכויות שמורות.
          </p>
          <Link to="/admin" className="landing-footer__admin">ניהול</Link>
        </div>
      </footer>

    </div>
  );
}

function RippleTitle({ text, className }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const letters = useMemo(() => [...(text || "")], [text]);

  const colorAt = useCallback((i) => {
    if (hoveredIdx === null) return "#ffffff";
    const d = Math.abs(i - hoveredIdx);
    if (d === 0) return "#6b7280";
    if (d === 1) return "#9ca3af";
    if (d === 2) return "#d1d5db";
    return "#ffffff";
  }, [hoveredIdx]);

  return (
    <h1 className={className}>
      {letters.map((ch, i) => (
        <span
          key={i}
          style={{ color: colorAt(i), transition: "color 120ms ease", display: "inline" }}
          onMouseEnter={() => setHoveredIdx(i)}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </h1>
  );
}

function CategorySlideshow({ slides }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % slides.length), 3500);
    return () => clearInterval(id);
  }, [slides.length]);
  return (
    <div className="category-slides">
      {slides.map((src, i) => (
        <img
          key={src}
          className={"category-slides__img" + (i === idx ? " category-slides__img--active" : "")}
          src={`/uploads/${src}`}
          alt=""
          loading={i === 0 ? "eager" : "lazy"}
        />
      ))}
    </div>
  );
}

function CategoryCard({ variant, title, body, image, slides = [], ctaLabel, to }) {
  const hasMedia = image || slides.length > 0;
  const className =
    "landing-category-card landing-category-card--" + variant +
    (hasMedia ? " landing-category-card--has-image" : "");
  return (
    <article className={className}>
      <div className="landing-category-card__art" aria-hidden="true">
        {image ? (
          <img src={image} alt="" />
        ) : slides.length > 0 ? (
          <CategorySlideshow slides={slides} />
        ) : null}
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      <Link to={to} className="landing-category-card__cta">
        {ctaLabel} <span className="cta-arrow"><ArrowRight /></span>
      </Link>
    </article>
  );
}
