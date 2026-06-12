import { useEffect, useState } from "react";
import { adminGetCustomClosetConfig, adminUpdateCustomClosetConfig, adminListComponentPrices, adminUpdateComponentPrice } from "../../api.js";
import { Check } from "../../components/Icons.jsx";
import "./AdminTab.css";
import "./CustomClosetConfigTab.css";

const DEFAULT = {
  minDoors: 1, maxDoors: 6,
  compartmentWidth: { min: 40, max: 120, step: 5, default: 60 },
  height:           { min: 150, max: 280, step: 5, default: 220 },
  depth:            { min: 40,  max: 80,  step: 5, default: 60 },
  allowDivider: true, allowHinged: true, allowSliding: true,
  allowShelf: true, allowRod: true, allowDrawer: true,
  minShelvesPerCabin: 2,
  stageMaxWidth: 240,
  addOnComponentIds: [],
  // Base pricing for the from-scratch designer: a simple 2-door closet per
  // door kind, plus a surcharge per additional door. Components (shelves,
  // rods, drawers...) add their own prices from the תוספות ארון tab.
  // 0 = not configured → the designer falls back to the built-in formula.
  basePriceHinged: 0,
  basePriceSliding: 0,
  extraDoorPrice: 0,
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
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([adminGetCustomClosetConfig(), adminListComponentPrices()])
      .then(([data, comps]) => {
        setCfg({ ...DEFAULT, ...data, addOnComponentIds: data.addOnComponentIds ?? [] });
        setComponents(comps);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function updateComponentType(id, itemType) {
    try {
      const updated = await adminUpdateComponentPrice(id, { item_type: itemType || null });
      setComponents(prev => prev.map(c => c.id === id ? { ...c, item_type: updated.item_type } : c));
    } catch (e) {
      setError(e.message);
    }
  }

  async function updateComponentMin(id, min) {
    const val = Math.max(0, Number(min) || 0);
    try {
      const updated = await adminUpdateComponentPrice(id, { min_per_cabin: val });
      setComponents(prev => prev.map(c => c.id === id ? { ...c, min_per_cabin: updated.min_per_cabin } : c));
    } catch (e) {
      setError(e.message);
    }
  }

  async function updateComponentMax(id, max) {
    const val = Math.max(0, Number(max) || 0);
    try {
      const updated = await adminUpdateComponentPrice(id, { max_per_cabin: val });
      setComponents(prev => prev.map(c => c.id === id ? { ...c, max_per_cabin: updated.max_per_cabin } : c));
    } catch (e) {
      setError(e.message);
    }
  }

  function toggleAddOn(id) {
    setCfg((c) => {
      const ids = c.addOnComponentIds ?? [];
      return {
        ...c,
        addOnComponentIds: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
      };
    });
  }

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
        <h3 className="cc-section__title">מידות</h3>
        <DimSection label="גובה" value={cfg.height}           onChange={set("height")} />
        <DimSection label="עומק" value={cfg.depth}            onChange={set("depth")} />
        <DimSection label="רוחב תא" value={cfg.compartmentWidth} onChange={set("compartmentWidth")} />
        <div className="cc-row" style={{ marginTop: "0.5rem" }}>
          <label className="cc-dim__field">
            <span>רוחב מקסימלי לבמה (רגליים)</span>
            <NumInput value={cfg.stageMaxWidth ?? 240} onChange={set("stageMaxWidth")} min={100} max={600} step={10} />
            <span className="cc-unit">ס״מ</span>
          </label>
        </div>
      </div>

      {/* ── Doors ──────────────────────────────────────────── */}
      <div className="cc-section">
        <h3 className="cc-section__title">דלתות</h3>
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

      {/* ── Base pricing ───────────────────────────────────── */}
      <div className="cc-section">
        <h3 className="cc-section__title">תמחור בסיס</h3>
        <p className="cc-section__sub">
          מחיר ארון בסיסי של 2 דלתות, לפי סוג הדלתות. כל דלת נוספת מוסיפה את
          התוספת שמוגדרת כאן. מחירי הרכיבים (מדפים, מוטות, מגירות) מתווספים
          אוטומטית לפי המחירים בלשונית ״תוספות ארון״. השאר 0 כדי להשתמש
          בנוסחת המחיר המובנית.
        </p>
        <div className="cc-row">
          <label className="cc-dim__field">
            <span>בסיס 2 דלתות — פתיחה (ציר)</span>
            <NumInput value={cfg.basePriceHinged} onChange={set("basePriceHinged")} min={0} step={50} />
            <span className="cc-unit">₪</span>
          </label>
          <label className="cc-dim__field">
            <span>בסיס 2 דלתות — הזזה</span>
            <NumInput value={cfg.basePriceSliding} onChange={set("basePriceSliding")} min={0} step={50} />
            <span className="cc-unit">₪</span>
          </label>
          <label className="cc-dim__field">
            <span>תוספת לכל דלת נוספת</span>
            <NumInput value={cfg.extraDoorPrice} onChange={set("extraDoorPrice")} min={0} step={50} />
            <span className="cc-unit">₪</span>
          </label>
        </div>
      </div>

      {/* Interior minimums are set per-component below ("מינ׳ לתא"),
          so the old closet-wide "מינימום מדפים לתא" field was removed
          to avoid duplication. */}

      {/* ── Add-ons ────────────────────────────────────────── */}
      <div className="cc-section">
        <h3 className="cc-section__title">תוספות אפשריות</h3>
        <p className="cc-section__sub">
          הפעלת פריט כאן מאפשרת ללקוח לבחור אותו בתהליך ההזמנה.
          סוג הפריט (מדף / מוט / מגירה) נקבע בלשונית "תוספות ארון".
        </p>
        {components.length === 0 ? (
          <p className="cc-empty">אין פריטים מוגדרים עדיין. הוסף פריטים בלשונית "תוספות ארון".</p>
        ) : (() => {
          const interiorItems = components.filter(c => c.item_type);
          const generalItems  = components.filter(c => !c.item_type);
          const TYPE_LABELS = { shelf: "מדף", rod: "מוט תליה", drawer: "מגירה", external_drawer: "מגירה חיצונית" };
          return (
            <>
              {interiorItems.length > 0 && (
                <>
                  <p className="cc-addons-group-label">פנים הארון — שלב 2</p>
                  <div className="cc-addons">
                    {interiorItems.map(comp => {
                      const checked = (cfg.addOnComponentIds ?? []).includes(comp.id);
                      return (
                        <div key={comp.id} className="cc-addon">
                          <Toggle checked={checked} onChange={() => toggleAddOn(comp.id)} label={comp.name} />
                          <span className="cc-addon__sku">{comp.sku || "—"}</span>
                          {/* Change the item's type (or reset to a general
                              add-on). This is the only place to RE-assign a
                              component that already has a type. */}
                          <select
                            className="cc-addon__mini-select"
                            value={comp.item_type ?? ""}
                            title="סוג הפריט"
                            aria-label="סוג הפריט"
                            onChange={e => updateComponentType(comp.id, e.target.value)}
                          >
                            <option value="shelf">מדף</option>
                            <option value="rod">מוט תליה</option>
                            <option value="drawer">מגירה</option>
                            <option value="external_drawer">מגירה חיצונית</option>
                            <option value="">תוספת כללית</option>
                          </select>
                          <label className="cc-addon__minmax" title="מינימום פריטים מסוג זה בכל תא">
                            <span>מינ׳ לתא</span>
                            <input
                              type="number"
                              className="cc-addon__min-input"
                              min={0}
                              max={20}
                              value={comp.min_per_cabin ?? 0}
                              aria-label="מינימום פריטים לתא"
                              onChange={e => updateComponentMin(comp.id, e.target.value)}
                            />
                          </label>
                          <label className="cc-addon__minmax" title="מקסימום פריטים מסוג זה בכל תא (0 = ללא הגבלה)">
                            <span>מקס׳ לתא</span>
                            <input
                              type="number"
                              className="cc-addon__min-input"
                              min={0}
                              max={20}
                              value={comp.max_per_cabin ?? 0}
                              aria-label="מקסימום פריטים לתא"
                              onChange={e => updateComponentMax(comp.id, e.target.value)}
                            />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              {generalItems.length > 0 && (
                <>
                  <p className="cc-addons-group-label cc-addons-group-label--general">תוספות כלליות</p>
                  <div className="cc-addons">
                    {generalItems.map(comp => {
                      const checked = (cfg.addOnComponentIds ?? []).includes(comp.id);
                      return (
                        <div key={comp.id} className="cc-addon">
                          <Toggle checked={checked} onChange={() => toggleAddOn(comp.id)} label={comp.name} />
                          <span className="cc-addon__sku">{comp.sku || "—"}</span>
                          <select className="cc-addon__mini-select cc-addon__mini-select--promote" value="" onChange={e => e.target.value && updateComponentType(comp.id, e.target.value)}>
                            <option value="">הוסף לשלב 2...</option>
                            <option value="shelf">כ-מדף</option>
                            <option value="rod">כ-מוט תליה</option>
                            <option value="drawer">כ-מגירה</option>
                            <option value="external_drawer">כ-מגירה חיצונית</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          );
        })()}
      </div>

      <div className="cc-actions">
        <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
          {saved ? <><Check /> נשמר</> : saving ? "שומר..." : "שמור הגדרות"}
        </button>
      </div>
    </div>
  );
}
