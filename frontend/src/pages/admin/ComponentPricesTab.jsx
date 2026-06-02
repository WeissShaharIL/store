import { useEffect, useState } from "react";
import {
  adminListComponentPrices,
  adminCreateComponentPrice,
  adminUpdateComponentPrice,
  adminDeleteComponentPrice,
} from "../../api.js";
import "./AdminTab.css";
import "./ComponentPricesTab.css";

const BASIS_OPTIONS = [
  { value: "fixed",  label: "קבוע" },
  { value: "width",  label: "רוחב הארון" },
  { value: "height", label: "גובה הארון" },
  { value: "depth",  label: "עומק הארון" },
];

function emptyForm() {
  return { name: "", sku: "", price_basis: "fixed", sort_order: 0 };
}

function emptyFixed() { return { price: "" }; }
function emptyRanges() { return [{ from: "", to: "", price: "" }]; }

function parseRules(rulesStr, basis) {
  try {
    const parsed = JSON.parse(rulesStr || (basis === "fixed" ? "{}" : "[]"));
    if (basis === "fixed") return { fixedPrice: parsed.price ?? "" };
    if (Array.isArray(parsed)) return { ranges: parsed.map(r => ({ from: r.from ?? "", to: r.to ?? "", price: r.price ?? "" })) };
  } catch {}
  return basis === "fixed" ? { fixedPrice: "" } : { ranges: emptyRanges() };
}

function buildRules(basis, fixedPrice, ranges) {
  if (basis === "fixed") return JSON.stringify({ price: Number(fixedPrice) || 0 });
  return JSON.stringify(
    ranges.map(r => ({
      from: r.from === "" ? 0 : Number(r.from),
      to: r.to === "" || r.to === null ? null : Number(r.to),
      price: Number(r.price) || 0,
    }))
  );
}

function basisLabel(val) {
  return BASIS_OPTIONS.find(o => o.value === val)?.label ?? val;
}

function RulesPreview({ rulesStr, basis }) {
  try {
    const r = JSON.parse(rulesStr || "{}");
    if (basis === "fixed") return <span>₪{r.price ?? 0}</span>;
    if (Array.isArray(r)) {
      return (
        <span>
          {r.map((row, i) => (
            <span key={i} className="cp-range-chip">
              {row.from}–{row.to == null ? "∞" : row.to}: ₪{row.price}
            </span>
          ))}
        </span>
      );
    }
  } catch {}
  return <span>—</span>;
}

export default function ComponentPricesTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // editingId = null → closed, "new" → new item, number → editing existing
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [fixedPrice, setFixedPrice] = useState("");
  const [ranges, setRanges] = useState(emptyRanges());

  useEffect(() => {
    adminListComponentPrices()
      .then(setItems)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function openNew() {
    setForm(emptyForm());
    setFixedPrice("");
    setRanges(emptyRanges());
    setEditingId("new");
    setError("");
  }

  function openEdit(item) {
    setForm({ name: item.name, sku: item.sku, price_basis: item.price_basis, sort_order: item.sort_order });
    const parsed = parseRules(item.rules, item.price_basis);
    if (item.price_basis === "fixed") {
      setFixedPrice(String(parsed.fixedPrice));
      setRanges(emptyRanges());
    } else {
      setFixedPrice("");
      setRanges(parsed.ranges?.length ? parsed.ranges : emptyRanges());
    }
    setEditingId(item.id);
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setError("");
  }

  function handleBasisChange(val) {
    setForm(f => ({ ...f, price_basis: val }));
    if (val === "fixed") { setFixedPrice(""); setRanges(emptyRanges()); }
    else { setFixedPrice(""); setRanges(emptyRanges()); }
  }

  function addRange() {
    setRanges(r => [...r, { from: "", to: "", price: "" }]);
  }

  function removeRange(idx) {
    setRanges(r => r.filter((_, i) => i !== idx));
  }

  function updateRange(idx, field, val) {
    setRanges(r => r.map((row, i) => i === idx ? { ...row, [field]: val } : row));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("יש להזין שם לרכיב."); return; }
    const rules = buildRules(form.price_basis, fixedPrice, ranges);
    const payload = { ...form, rules };
    setSaving(true);
    setError("");
    try {
      if (editingId === "new") {
        const created = await adminCreateComponentPrice(payload);
        setItems(prev => [...prev, created]);
      } else {
        const updated = await adminUpdateComponentPrice(editingId, payload);
        setItems(prev => prev.map(it => it.id === editingId ? updated : it));
      }
      setEditingId(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!confirm(`למחוק את "${item.name}"?`)) return;
    try {
      await adminDeleteComponentPrice(item.id);
      setItems(prev => prev.filter(it => it.id !== item.id));
      if (editingId === item.id) setEditingId(null);
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) return <div className="tab-loading">טוען...</div>;

  return (
    <div className="admin-tab-content">
      <div className="tab-toolbar">
        <h2>מחירי רכיבים</h2>
        <button className="btn btn--primary btn--sm" onClick={openNew} disabled={editingId !== null}>
          + הוסף רכיב
        </button>
      </div>

      {error && <p className="tab-error">{error}</p>}

      {/* List */}
      {items.length === 0 && editingId === null ? (
        <p className="cp-empty">אין רכיבים עדיין. לחץ על ״+ הוסף רכיב״ כדי להתחיל.</p>
      ) : (
        <table className="cp-table">
          <thead>
            <tr>
              <th>שם</th>
              <th>מק״ט</th>
              <th>בסיס תמחור</th>
              <th>כללי מחיר</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className={editingId === item.id ? "cp-row--editing" : ""}>
                <td className="cp-name">{item.name}</td>
                <td className="cp-sku">{item.sku || "—"}</td>
                <td>{basisLabel(item.price_basis)}</td>
                <td className="cp-rules"><RulesPreview rulesStr={item.rules} basis={item.price_basis} /></td>
                <td className="cp-actions">
                  <button className="btn btn--ghost btn--sm" onClick={() => openEdit(item)} disabled={editingId !== null}>ערוך</button>
                  <button className="btn btn--ghost btn--sm cp-del" onClick={() => handleDelete(item)}>מחק</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Inline editor */}
      {editingId !== null && (
        <div className="cp-editor">
          <h3 className="cp-editor__title">{editingId === "new" ? "רכיב חדש" : "עריכת רכיב"}</h3>

          <div className="cp-editor__row">
            <label>שם רכיב *</label>
            <input
              type="text"
              placeholder="לדוגמה: מדף, תחתית, גב"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="cp-editor__row">
            <label>מק״ט</label>
            <input
              type="text"
              placeholder="לדוגמה: SHELF-001"
              value={form.sku}
              onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
            />
          </div>

          <div className="cp-editor__row">
            <label>בסיס תמחור</label>
            <select value={form.price_basis} onChange={e => handleBasisChange(e.target.value)}>
              {BASIS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {form.price_basis === "fixed" ? (
            <div className="cp-editor__row">
              <label>מחיר (₪)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={fixedPrice}
                onChange={e => setFixedPrice(e.target.value)}
              />
            </div>
          ) : (
            <div className="cp-editor__ranges">
              <label className="cp-ranges-label">טווחי מחיר לפי {basisLabel(form.price_basis)} (ס״מ)</label>
              <div className="cp-ranges-head">
                <span>מ- (ס״מ)</span>
                <span>עד (ס״מ)</span>
                <span>מחיר (₪)</span>
                <span></span>
              </div>
              {ranges.map((row, idx) => (
                <div key={idx} className="cp-range-row">
                  <input
                    type="number"
                    min="0"
                    placeholder="מ-"
                    value={row.from}
                    onChange={e => updateRange(idx, "from", e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="ריק=∞"
                    value={row.to}
                    onChange={e => updateRange(idx, "to", e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="₪"
                    value={row.price}
                    onChange={e => updateRange(idx, "price", e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm cp-del"
                    onClick={() => removeRange(idx)}
                    disabled={ranges.length === 1}
                  >מחק</button>
                </div>
              ))}
              <button type="button" className="btn btn--ghost btn--sm cp-add-range" onClick={addRange}>
                + הוסף טווח
              </button>
            </div>
          )}

          <div className="cp-editor__row">
            <label>סדר הצגה</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
            />
          </div>

          {error && <p className="tab-error">{error}</p>}

          <div className="cp-editor__actions">
            <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? "שומר..." : "שמור"}
            </button>
            <button className="btn btn--ghost" onClick={cancelEdit} disabled={saving}>ביטול</button>
          </div>
        </div>
      )}
    </div>
  );
}
