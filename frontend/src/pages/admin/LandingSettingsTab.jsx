import { useEffect, useState } from "react";
import { getLandingSettings, updateLandingSettings } from "../../api.js";
import "./AdminTab.css";

const FIELDS = [
  { key: "welcome_title", label: "כותרת ראשית" },
  { key: "welcome_subtitle", label: "כותרת משנה" },
  { key: "hero_tagline", label: "טקסט תיאור" },
  { key: "about_text", label: "טקסט אודות", multiline: true },
  { key: "contact_phone", label: "טלפון ליצירת קשר" },
  { key: "contact_whatsapp", label: "מספר WhatsApp" },
];

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
        <button type="submit" className="settings-save-btn" disabled={saving}>
          {saved ? "✓ נשמר" : saving ? "שומר..." : "שמור"}
        </button>
      </form>
    </div>
  );
}
