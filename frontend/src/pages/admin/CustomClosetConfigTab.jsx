import { useEffect, useState } from "react";
import { adminGetCustomClosetConfig, adminUpdateCustomClosetConfig } from "../../api.js";
import "./AdminTab.css";
import "./CustomClosetConfigTab.css";

const DEFAULT = {
  minDoors: 1, maxDoors: 6,
  compartmentWidth: { min: 40, max: 120, step: 5, default: 60 },
  height:           { min: 150, max: 280, step: 5, default: 220 },
  depth:            { min: 40,  max: 80,  step: 5, default: 60 },
  allowDivider: true, allowHinged: true, allowSliding: true,
  minShelvesPerCabin: 2,
};

function NumInput({ value, onChange, min = 0, max, step = 1 }) {
  return (
    <input
      type="number"
      className="cc-num"
      value={value ?? ""}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

function DimSection({ label, value, onChange }) {
  const set = (field) => (v) => onChange({ ...value, [field]: v });
  return (
    <div className="cc-dim">
      <span className="cc-dim__label">{label}</span>
      <div className="cc-dim__fields">
        <label className="cc-dim__field">
          <span>מינימום</span>
          <NumInput value={value.min} onChange={set("min")} min={1} />
          <span className="cc-unit">ס״מ</span>
        </label>
        <label className="cc-dim__field">
          <span>מקסימום</span>
          <NumInput value={value.max} onChange={set("max")} min={1} />
          <span className="cc-unit">ס״מ</span>
        </label>
        <label className="cc-dim__field">
          <span>צעד</span>
          <NumInput value={value.step} onChange={set("step")} min={1} />
          <span className="cc-unit">ס״מ</span>
        </label>
        <label className="cc-dim__field">
          <span>ברירת מחדל</span>
          <NumInput value={value.default} onChange={set("default")} min={1} />
          <span className="cc-unit">ס״מ</span>
        </label>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="cc-toggle">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="cc-toggle__track" />
      <span className="cc-toggle__label">{label}</span>
    </label>
  );
}

export default function CustomClosetConfigTab() {
  const [cfg, setCfg] = useState(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    adminGetCustomClosetConfig()
      .then((data) => setCfg({ ...DEFAULT, ...data }))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const set = (field) => (v) => setCfg((c) => ({ ...c, [field]: v }));

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const updated = await adminUpdateCustomClosetConfig(cfg);
      setCfg({ ...DEFAULT, ...updated });
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
        <h2>ארון בהתאמה אישית — הגדרות</h2>
      </div>
      {error && <p className="tab-error">{error}</p>}

      {/* ── Dimensions ─────────────────────────────────────── */}
      <div className="cc-section">
        <h3 className="cc-section__title">📐 מידות</h3>
        <DimSection label="גובה" value={cfg.height}           onChange={set("height")} />
        <DimSection label="עומק" value={cfg.depth}            onChange={set("depth")} />
        <DimSection label="רוחב תא" value={cfg.compartmentWidth} onChange={set("compartmentWidth")} />
      </div>

      {/* ── Doors ──────────────────────────────────────────── */}
      <div className="cc-section">
        <h3 className="cc-section__title">🚪 דלתות</h3>
        <div className="cc-row">
          <label className="cc-dim__field">
            <span>מינימום דלתות</span>
            <NumInput value={cfg.minDoors} onChange={set("minDoors")} min={1} max={20} />
          </label>
          <label className="cc-dim__field">
            <span>מקסימום דלתות</span>
            <NumInput value={cfg.maxDoors} onChange={set("maxDoors")} min={1} max={20} />
          </label>
        </div>
        <div className="cc-toggles">
          <Toggle checked={cfg.allowSliding} onChange={set("allowSliding")} label="אפשר דלתות הזזה" />
          <Toggle checked={cfg.allowHinged}  onChange={set("allowHinged")}  label="אפשר דלתות פתיחה" />
        </div>
      </div>

      {/* ── Interior ───────────────────────────────────────── */}
      <div className="cc-section">
        <h3 className="cc-section__title">📦 פנים הארון</h3>
        <div className="cc-row">
          <label className="cc-dim__field">
            <span>מינימום מדפים לתא</span>
            <NumInput value={cfg.minShelvesPerCabin} onChange={set("minShelvesPerCabin")} min={0} max={10} />
          </label>
        </div>
        <div className="cc-toggles">
          <Toggle checked={cfg.allowDivider} onChange={set("allowDivider")} label="אפשר מחיצה פנימית" />
        </div>
      </div>

      <div className="cc-actions">
        <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
          {saved ? "✓ נשמר" : saving ? "שומר..." : "שמור הגדרות"}
        </button>
      </div>
    </div>
  );
}
