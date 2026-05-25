import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPublicSettings, getActiveLogo } from "../api.js";
import "./LandingPage.css";

export default function LandingPage() {
  const [settings, setSettings] = useState({});
  const [logo, setLogo] = useState(null);

  useEffect(() => {
    getPublicSettings().then(setSettings).catch(() => {});
    getActiveLogo().then(setLogo).catch(() => {});
  }, []);

  const title = settings.welcome_title || "ארונות בהתאמה אישית";
  const subtitle = settings.welcome_subtitle || "";
  const tagline = settings.hero_tagline || "";
  const phone = settings.contact_phone || "";
  const whatsapp = settings.contact_whatsapp || "";

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          {logo ? (
            <img src={`/uploads/${logo.image_path}`} alt="לוגו" className="landing-logo" />
          ) : (
            <span className="landing-logo-text">{title}</span>
          )}
          <div className="landing-nav-links">
            <Link to="/showroom">התצוגה</Link>
            <Link to="/cart" className="landing-nav-cta">הצעת מחיר</Link>
          </div>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-content">
          <h1>{title}</h1>
          {tagline && <p className="landing-tagline">{tagline}</p>}
          {subtitle && <p className="landing-subtitle">{subtitle}</p>}
          <div className="landing-hero-actions">
            <Link to="/showroom" className="btn-primary">לתצוגת הארונות</Link>
            {(phone || whatsapp) && (
              <a
                href={whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, "")}` : `tel:${phone}`}
                className="btn-secondary"
                target={whatsapp ? "_blank" : undefined}
                rel="noreferrer"
              >
                צור קשר
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="landing-categories">
        <div className="landing-section-inner">
          <h2>בחר סגנון ארון</h2>
          <div className="landing-category-cards">
            <Link to="/showroom?type=hinged" className="category-card">
              <div className="category-card-icon">🚪</div>
              <span>ארון דלתות צירים</span>
            </Link>
            <Link to="/showroom?type=sliding" className="category-card">
              <div className="category-card-icon">↔️</div>
              <span>ארון דלתות הזזה</span>
            </Link>
            <Link to="/display-sale" className="category-card highlight">
              <div className="category-card-icon">🏷️</div>
              <span>מכירת מתצוגה</span>
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-section-inner">
          {phone && <a href={`tel:${phone}`}>{phone}</a>}
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          )}
        </div>
      </footer>
    </div>
  );
}
