import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getActiveLogo, getDoorTypeCovers, getPublicClosets, getPublicHeroBanners, getPublicSettings, submitLead } from "../api.js";
import CartIcon from "../components/CartIcon.jsx";
import FormaLogo from "../components/FormaLogo.jsx";
import { ArrowRight, Check, Send } from "../components/Icons.jsx";
import "../styles/landing/01-shell-nav.css";
import "../styles/landing/02-hero.css";
import "../styles/landing/03-categories.css";
import "../styles/landing/04-gallery.css";
import "../styles/landing/05-contact.css";
import "../styles/landing/06-footer.css";
import "../styles/landing/07-whatsapp.css";
import "../styles/landing/08-closet-anim.css";
import "../styles/landing/09-scroll-fx.css";
import "../styles/landing/10-landing-buttons.css";

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
        try { return JSON.parse(c.config_json || "{}").kind === "sliding"; }
        catch { return false; }
      })
      .map((c) => c.image_path),
    [closets],
  );
  const hingedSlides = useMemo(
    () => closets
      .filter((c) => {
        if (!c.image_path) return false;
        try { return JSON.parse(c.config_json || "{}").kind === "hinged"; }
        catch { return false; }
      })
      .map((c) => c.image_path),
    [closets],
  );

  // Scroll-driven section focus: once a section turns black it never goes grey
  // again — maxReached only increases, so scrolling back up keeps prior
  // sections black.
  useEffect(() => {
    const getSections = () => [...document.querySelectorAll("[data-scroll-section]")];
    let maxReached = 0;

    function activate() {
      const sections = getSections();
      if (!sections.length) return;
      const mid = window.scrollY + window.innerHeight / 2;
      let bestIdx = 0;
      let bestDist = Infinity;
      sections.forEach((s, i) => {
        const rect = s.getBoundingClientRect();
        const center = window.scrollY + rect.top + rect.height / 2;
        const d = Math.abs(center - mid);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      });
      maxReached = Math.max(maxReached, bestIdx);
      sections.forEach((s, i) => s.classList.toggle("landing-scroll-section--active", i <= maxReached));
    }

    window.addEventListener("scroll", activate, { passive: true });
    activate();
    return () => window.removeEventListener("scroll", activate);
  }, []);

  const contactRef = useRef(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [contactErr, setContactErr] = useState("");

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
      setTimeout(() => setSent(false), 5000);
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
  const brandName = settings.brand_name || "Store";

  return (
    <div className="landing">
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
            <div className="section-hover-title">
              <h2 className="section-hover-title__h2 landing-section__title">הארונות שלנו</h2>
              <Link to="/showroom" className="section-hover-title__reveal">
                הצג
              </Link>
            </div>
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
                <figure key={c.id} className="landing-gallery__card">
                  <img src={`/uploads/${c.image_path || defaultClosetImage}`} alt={c.name} loading="lazy" />
                  <figcaption>{c.name}</figcaption>
                </figure>
              ))}
            </div>
            <div className="landing-gallery__cta-row">
              <Link to="/showroom" className="btn btn--primary">
                לכל הדגמים <ArrowRight />
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
        </div>
      </footer>

      {whatsappHref && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="landing-whatsapp"
          aria-label="צרו איתנו קשר בוואטסאפ"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
            <path fill="currentColor" d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.687-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l.354.563-1.001 3.656 3.626-.974z"/>
            <path fill="currentColor" d="M9.536 5.685c-.222-.494-.456-.504-.668-.513l-.568-.007c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479s1.065 2.876 1.213 3.074c.149.198 2.096 3.36 5.177 4.573 2.559 1.008 3.078.808 3.633.757.555-.05 1.79-.732 2.043-1.438.253-.706.253-1.31.177-1.438-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.668.149-.198.297-.768.967-.94 1.165-.174.198-.347.223-.644.075-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.762-1.652-2.06-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.297.297-.495.099-.198.05-.372-.025-.521-.075-.149-.652-1.62-.918-2.213z"/>
          </svg>
        </a>
      )}
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
        ) : (
          <div className={"closet-anim closet-anim--" + variant}>
            <div className="closet-anim__body">
              <div className="closet-anim__interior">
                <div className="closet-anim__shelf" />
                <div className="closet-anim__shelf" />
                <div className="closet-anim__reveal">
                  {variant === "sliding" ? "הזזה" : "פתיחה"}
                </div>
              </div>
            </div>
            <div className="closet-anim__base">
              <div className="closet-anim__leg" />
              <div className="closet-anim__leg" />
            </div>
          </div>
        )}
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      <Link to={to} className="landing-category-card__cta">
        {ctaLabel} <ArrowRight />
      </Link>
    </article>
  );
}
