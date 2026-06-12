import { useEffect, useState } from "react";
import {
  adminActivateLogo, adminDeleteLogo, adminGetLogos, adminUploadLogo,
  adminChangePassword, getSettings, updateSettings,
} from "../../api.js";
import { useSiteSettings, parseNavItems } from "../../contexts/ThemeContext.jsx";
import { useConfirm } from "./useConfirm.jsx";
import { Check, Plus, Trash } from "../../components/Icons.jsx";
import "./AdminTab.css";
import "./AdminSettings.css";

const THEMES = [
  { id: "light", label: "בהיר",  preview: "#f6f7fb" },
  { id: "dark",  label: "כהה",   preview: "#0a0f1f" },
  { id: "sepia", label: "ספיה",  preview: "#f5f0e8" },
];

const FONT_SIZES = [
  { id: "sm", label: "קטן" },
  { id: "md", label: "בינוני" },
  { id: "lg", label: "גדול" },
];

const DEFAULT_NAV_ITEMS = [
  { id: "catalog",  label: "קטלוג",  visible: true },
  { id: "orders",   label: "הזמנות", visible: true },
  { id: "messages", label: "הודעות", visible: true },
];

export default function SettingsTab() {
  const { confirm, dialog } = useConfirm();
  const { setSettings: applySiteSettings } = useSiteSettings();

  // ── Password ──────────────────────────────────────────────
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState("");
  const [cpDone, setCpDone] = useState(false);

  // ── Logos ─────────────────────────────────────────────────
  const [logos, setLogos] = useState([]);
  const [logoError, setLogoError] = useState("");

  // ── Appearance + Nav ──────────────────────────────────────
  const [theme, setThemeState] = useState("light");
  const [navFontSize, setNavFontSize] = useState("md");
  const [navItems, setNavItems] = useState(DEFAULT_NAV_ITEMS);
  const [appearanceSaving, setAppearanceSaving] = useState(false);
  const [appearanceDone, setAppearanceDone] = useState(false);

  useEffect(() => {
    adminGetLogos().then(setLogos).catch((e) => setLogoError(e.message));
    getSettings().then((data) => {
      if (data.site_theme) setThemeState(data.site_theme);
      if (data.nav_font_size) setNavFontSize(data.nav_font_size);
      if (data.nav_items_json) {
        const parsed = parseNavItems(data.nav_items_json);
        if (parsed.length) setNavItems(parsed);
      }
    }).catch(() => {});
  }, []);

  // ── Password handlers ────────────────────────────────────
  async function handleChangePassword(e) {
    e.preventDefault();
    setCpError(""); setCpDone(false);
    if (cpNew !== cpConfirm) { setCpError("הסיסמאות אינן תואמות"); return; }
    if (cpNew.length < 6) { setCpError("הסיסמה החדשה חייבת להכיל לפחות 6 תווים"); return; }
    setCpLoading(true);
    try {
      await adminChangePassword(cpCurrent, cpNew);
      setCpDone(true);
      setCpCurrent(""); setCpNew(""); setCpConfirm("");
    } catch (err) {
      setCpError(err.message);
    } finally {
      setCpLoading(false);
    }
  }

  // ── Logo handlers ────────────────────────────────────────
  async function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", file.name);
    try {
      const logo = await adminUploadLogo(fd);
      setLogos((prev) => [logo, ...prev]);
    } catch (err) {
      setLogoError(err.message);
    }
    e.target.value = "";
  }

  async function handleActivateLogo(id) {
    try {
      await adminActivateLogo(id);
      setLogos((prev) => prev.map((l) => ({ ...l, is_active: l.id === id })));
    } catch (err) {
      setLogoError(err.message);
    }
  }

  async function handleDeleteLogo(id) {
    if (!await confirm("למחוק לוגו זה?")) return;
    try {
      await adminDeleteLogo(id);
      setLogos((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setLogoError(err.message);
    }
  }

  // ── Appearance + nav save ────────────────────────────────
  async function handleSaveAppearance() {
    setAppearanceSaving(true); setAppearanceDone(false);
    try {
      const values = {
        site_theme: theme,
        nav_font_size: navFontSize,
        nav_items_json: JSON.stringify(navItems),
      };
      await updateSettings(values);
      applySiteSettings((prev) => ({ ...prev, ...values }));
      setAppearanceDone(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setAppearanceSaving(false);
    }
  }

  function toggleNavItem(id) {
    setNavItems((prev) =>
      prev.map((item) => item.id === id ? { ...item, visible: !item.visible } : item)
    );
  }

  function updateNavLabel(id, label) {
    setNavItems((prev) =>
      prev.map((item) => item.id === id ? { ...item, label } : item)
    );
  }

  return (
    <div className="admin-tab-content">
      <div className="tab-toolbar"><h2>הגדרות</h2></div>

      {/* ── Logos ── */}
      <section className="settings-section">
        <div className="settings-section__head"><h3>לוגו האתר</h3></div>
        {logoError && <p className="tab-error">{logoError}</p>}
        <div className="settings-logos">
          {logos.map((logo) => (
            <div
              key={logo.id}
              className={"settings-logo-card" + (logo.is_active ? " settings-logo-card--active" : "")}
            >
              <img src={`/uploads/${logo.image_path}`} alt={logo.name} className="settings-logo-card__img" />
              <div className="settings-logo-card__name">{logo.name}</div>
              <div className="settings-logo-card__actions">
                {logo.is_active
                  ? <span className="settings-logo-card__badge">פעיל</span>
                  : (
                    <>
                      <button type="button" className="btn btn--sm btn--ghost" onClick={() => handleActivateLogo(logo.id)}>הפעל</button>
                      <button type="button" className="btn btn--sm btn--ghost" onClick={() => handleDeleteLogo(logo.id)}><Trash width={14} height={14} /></button>
                    </>
                  )
                }
              </div>
            </div>
          ))}
          <label className="settings-logo-upload">
            <Plus width={18} height={18} />
            <span>העלה לוגו</span>
            <input type="file" accept="image/*" hidden onChange={handleLogoUpload} />
          </label>
        </div>
      </section>

      {/* ── Appearance ── */}
      <section className="settings-section">
        <div className="settings-section__head"><h3>מראה האתר</h3></div>
        <div className="settings-field">
          <label>ערכת צבעים</label>
          <div className="settings-picker">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={"settings-picker__btn" + (theme === t.id ? " settings-picker__btn--active" : "")}
                onClick={() => setThemeState(t.id)}
              >
                <span className="settings-picker__dot" style={{ background: t.preview, border: "1px solid rgba(0,0,0,0.12)" }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-field" style={{ marginTop: "1rem" }}>
          <label>גודל פונט בתפריט</label>
          <div className="settings-picker">
            {FONT_SIZES.map((f) => (
              <button
                key={f.id}
                type="button"
                className={"settings-picker__btn" + (navFontSize === f.id ? " settings-picker__btn--active" : "")}
                onClick={() => setNavFontSize(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-field" style={{ marginTop: "1rem" }}>
          <label>פריטי תפריט לקוח</label>
          <div className="settings-nav-items">
            {navItems.map((item) => (
              <div key={item.id} className="settings-nav-row">
                <label className="settings-nav-row__toggle">
                  <input type="checkbox" checked={item.visible !== false} onChange={() => toggleNavItem(item.id)} />
                  <span>מוצג</span>
                </label>
                <input
                  type="text"
                  className="settings-nav-row__text"
                  value={item.label}
                  onChange={(e) => updateNavLabel(item.id, e.target.value)}
                  dir="rtl"
                  maxLength={20}
                />
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "1.25rem" }}>
          <button type="button" className="settings-save-btn" disabled={appearanceSaving} onClick={handleSaveAppearance}>
            {appearanceSaving ? "שומר..." : "שמור מראה ותפריט"}
          </button>
          {appearanceDone && (
            <span style={{ color: "#86efac", fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
              נשמר <Check width={14} height={14} />
            </span>
          )}
        </div>
      </section>

      {/* ── Password ── */}
      <section className="settings-section">
        <div className="settings-section__head"><h3>שינוי סיסמה</h3></div>
        <form onSubmit={handleChangePassword} className="settings-form" style={{ maxWidth: 360 }}>
          <div className="settings-field">
            <label>סיסמה נוכחית</label>
            <input type="password" value={cpCurrent} onChange={(e) => setCpCurrent(e.target.value)} required />
          </div>
          <div className="settings-field">
            <label>סיסמה חדשה</label>
            <input type="password" value={cpNew} onChange={(e) => setCpNew(e.target.value)} required />
          </div>
          <div className="settings-field">
            <label>אימות סיסמה חדשה</label>
            <input type="password" value={cpConfirm} onChange={(e) => setCpConfirm(e.target.value)} required />
          </div>
          {cpError && <p className="tab-error">{cpError}</p>}
          {cpDone && (
            <p style={{ color: "#86efac", fontSize: "0.82rem", margin: 0, display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              הסיסמה שונתה בהצלחה <Check width={15} height={15} />
            </p>
          )}
          <button type="submit" disabled={cpLoading} className="settings-save-btn">
            {cpLoading ? "שומר..." : "שמור סיסמה"}
          </button>
        </form>
      </section>

      {dialog}
    </div>
  );
}
