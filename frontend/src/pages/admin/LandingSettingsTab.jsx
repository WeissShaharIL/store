import { useEffect, useRef, useState } from "react";
import {
  getLandingSettings, updateLandingSettings,
  adminGetHeroBanners, adminUploadHeroBanner, adminDeleteHeroBanner,
  adminUploadDefaultClosetImage, adminDeleteDefaultClosetImage,
  adminGetDoorTypeCovers, adminUploadDoorTypeCover, adminDeleteDoorTypeCover,
  getPublicSettings,
} from "../../api.js";
import "./AdminTab.css";

const FIELDS = [
  { key: "welcome_title",    label: "כותרת ראשית" },
  { key: "welcome_subtitle", label: "כותרת משנה" },
  { key: "hero_tagline",     label: "טקסט תיאור" },
  { key: "about_text",       label: "טקסט אודות", multiline: true },
  { key: "contact_phone",    label: "טלפון ליצירת קשר" },
  { key: "contact_whatsapp", label: "מספר WhatsApp" },
];

const TRUST_DEFAULTS = [
  { title: "ייצור עצמי",    body: "שליטה מלאה על האיכות" },
  { title: "אחריות 5 שנים", body: "על כל המוצרים שלנו" },
  { title: "התקנה מקצועית", body: "צוות מנוסה בשטח" },
  { title: "התאמה אישית",   body: "לכל גודל ועיצוב" },
];

function parseTrust(raw) {
  try { const parsed = JSON.parse(raw || "[]"); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
}

function TrustBarEditor({ value, onChange }) {
  const items = parseTrust(value).length ? parseTrust(value) : TRUST_DEFAULTS;

  function update(idx, field, val) {
    const next = items.map((it, i) => i === idx ? { ...it, [field]: val } : it);
    onChange(JSON.stringify(next));
  }
  function remove(idx) {
    onChange(JSON.stringify(items.filter((_, i) => i !== idx)));
  }
  function add() {
    onChange(JSON.stringify([...items, { title: "", body: "" }]));
  }

  return (
    <div className="trust-editor">
      {items.map((item, idx) => (
        <div key={idx} className="trust-editor__row">
          <input
            type="text"
            placeholder="כותרת"
            value={item.title}
            onChange={(e) => update(idx, "title", e.target.value)}
          />
          <input
            type="text"
            placeholder="תיאור"
            value={item.body}
            onChange={(e) => update(idx, "body", e.target.value)}
          />
          <button type="button" className="trust-editor__del" onClick={() => remove(idx)} title="הסר">✕</button>
        </div>
      ))}
      {items.length < 8 && (
        <button type="button" className="btn btn--ghost btn--sm trust-editor__add" onClick={add}>
          + הוסף שורה
        </button>
      )}
    </div>
  );
}

function HeroBannerManager() {
  const [banners, setBanners] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    adminGetHeroBanners().then(setBanners).catch((e) => setError(e.message));
  }, []);

  async function handleUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const banner = await adminUploadHeroBanner(fd);
        setBanners((prev) => [...prev, banner]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(id) {
    try {
      await adminDeleteHeroBanner(id);
      setBanners((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="settings-section">
      <div className="settings-section__head">
        <h3>תמונות רקע לדף הבית</h3>
        <p className="settings-section__sub">התמונות מוצגות ברוטציה בכניסה לאתר. ניתן להעלות מספר תמונות.</p>
      </div>

      {error && <p className="tab-error">{error}</p>}

      <div className="hero-banners-grid">
        {banners.map((b) => (
          <div key={b.id} className="hero-banner-thumb">
            <img src={`/uploads/${b.image_path}`} alt="" />
            <button
              className="hero-banner-thumb__delete"
              onClick={() => handleDelete(b.id)}
              title="מחק"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          className="hero-banner-upload-btn"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "מעלה..." : "+ הוסף תמונה"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={handleUpload}
        />
      </div>
    </div>
  );
}

const DOOR_KINDS = [
  { key: "sliding", label: "דלתות הזזה" },
  { key: "hinged",  label: "דלתות פתיחה" },
];

function DoorTypeCoversManager() {
  const [covers, setCovers] = useState({});
  const [uploading, setUploading] = useState({});
  const [error, setError] = useState("");
  const slidingRef = useRef(null);
  const hingedRef  = useRef(null);
  const fileRefs = { sliding: slidingRef, hinged: hingedRef };

  useEffect(() => {
    adminGetDoorTypeCovers()
      .then((rows) => {
        const map = {};
        for (const c of (rows || [])) map[c.kind] = c.image_path;
        setCovers(map);
      })
      .catch((e) => setError(e.message));
  }, []);

  async function handleUpload(kind, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading((prev) => ({ ...prev, [kind]: true }));
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await adminUploadDoorTypeCover(kind, fd);
      setCovers((prev) => ({ ...prev, [kind]: res.image_path }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading((prev) => ({ ...prev, [kind]: false }));
      e.target.value = "";
    }
  }

  async function handleDelete(kind) {
    try {
      await adminDeleteDoorTypeCover(kind);
      setCovers((prev) => { const n = { ...prev }; delete n[kind]; return n; });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="settings-section">
      <div className="settings-section__head">
        <h3>תמונות קטגוריות דף הבית</h3>
        <p className="settings-section__sub">מוצגות בכרטיסי הקטגוריה (דלתות הזזה / פתיחה) בדף הבית.</p>
      </div>
      {error && <p className="tab-error">{error}</p>}
      <div className="door-covers-grid">
        {DOOR_KINDS.map(({ key, label }) => (
          <div key={key} className="door-cover-item">
            <p className="door-cover-item__label">{label}</p>
            {covers[key] ? (
              <div className="default-closet-image__preview">
                <img src={`/uploads/${covers[key]}`} alt={label} />
                <button
                  className="default-closet-image__delete"
                  onClick={() => handleDelete(key)}
                  title="הסר תמונה"
                >✕</button>
              </div>
            ) : (
              <div className="default-closet-image__placeholder">אין תמונה</div>
            )}
            <button
              className="btn btn--primary btn--sm"
              onClick={() => fileRefs[key].current?.click()}
              disabled={uploading[key]}
            >
              {uploading[key] ? "מעלה..." : covers[key] ? "החלף תמונה" : "העלה תמונה"}
            </button>
            <input
              ref={fileRefs[key]}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleUpload(key, e)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function DefaultClosetImageManager() {
  const [imagePath, setImagePath] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    getPublicSettings()
      .then((s) => setImagePath(s.default_closet_image || null))
      .catch(() => {});
  }, []);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await adminUploadDefaultClosetImage(fd);
      setImagePath(res.image_path);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete() {
    try {
      await adminDeleteDefaultClosetImage();
      setImagePath(null);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="settings-section">
      <div className="settings-section__head">
        <h3>תמונת ארון ברירת מחדל</h3>
        <p className="settings-section__sub">
          מוצגת בכרטיסי הארונות כאשר לדגם לא הועלתה תמונה ספציפית.
        </p>
      </div>
      {error && <p className="tab-error">{error}</p>}
      <div className="default-closet-image">
        {imagePath ? (
          <div className="default-closet-image__preview">
            <img src={`/uploads/${imagePath}`} alt="ברירת מחדל" />
            <button
              className="default-closet-image__delete"
              onClick={handleDelete}
              title="הסר תמונה"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="default-closet-image__placeholder">אין תמונה</div>
        )}
        <button
          className="btn btn--primary btn--sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "מעלה..." : imagePath ? "החלף תמונה" : "העלה תמונה"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleUpload}
        />
      </div>
    </div>
  );
}

export default function LandingSettingsTab() {
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getLandingSettings()
      .then(setValues)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await updateLandingSettings(values);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="tab-loading">טוען...</div>;

  return (
    <div className="admin-tab-content">
      <div className="tab-toolbar">
        <h2>הגדרות דף בית</h2>
      </div>
      {error && <p className="tab-error">{error}</p>}

      <HeroBannerManager />
      <DoorTypeCoversManager />
      <DefaultClosetImageManager />

      <form onSubmit={handleSave} className="settings-form">
        {FIELDS.map(({ key, label, multiline }) => (
          <div key={key} className="settings-field">
            <label>{label}</label>
            {multiline ? (
              <textarea
                value={values[key] || ""}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                rows={3}
              />
            ) : (
              <input
                type="text"
                value={values[key] || ""}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              />
            )}
          </div>
        ))}
        <div className="settings-field settings-field--full">
          <label>יתרונות (Trust Bar)</label>
          <TrustBarEditor
            value={values.trust_items || ""}
            onChange={(v) => setValues((prev) => ({ ...prev, trust_items: v }))}
          />
        </div>

        <button type="submit" className="settings-save-btn" disabled={saving}>
          {saved ? "✓ נשמר" : saving ? "שומר..." : "שמור"}
        </button>
      </form>
    </div>
  );
}
