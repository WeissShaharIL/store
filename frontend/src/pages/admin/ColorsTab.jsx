import { useEffect, useState } from "react";
import { adminCreateColor, adminDeleteColor, adminGetColors, adminUpdateColor } from "../../api.js";
import { useConfirm } from "./useConfirm.jsx";
import { X } from "../../components/Icons.jsx";
import "./AdminTab.css";

export default function ColorsTab() {
  const { confirm, dialog } = useConfirm();
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newColor, setNewColor] = useState({ color_key: "", name: "", wood: "#ffffff", trim: "#cccccc", swatch: "#ffffff" });

  useEffect(() => { load(); }, []);

  async function load() {
    try { setColors(await adminGetColors()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const c = await adminCreateColor(newColor);
      setColors((prev) => [...prev, c]);
      setCreating(false);
      setNewColor({ color_key: "", name: "", wood: "#ffffff", trim: "#cccccc", swatch: "#ffffff" });
    } catch (e) { setError(e.message); }
  }

  async function handleDelete(id) {
    if (!await confirm("למחוק את הצבע?")) return;
    try {
      await adminDeleteColor(id);
      setColors((prev) => prev.filter((c) => c.id !== id));
    } catch (e) { setError(e.message); }
  }

  if (loading) return <div className="tab-loading">טוען...</div>;

  return (
    <div className="admin-tab-content">
      <div className="tab-toolbar">
        <h2>צבעי פלטה</h2>
        <button className="btn-add" onClick={() => setCreating(true)}>+ חדש</button>
      </div>
      {error && <p className="tab-error">{error}</p>}
      {creating && (
        <form onSubmit={handleCreate} className="create-form" style={{ flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input placeholder="מפתח (color_key)" value={newColor.color_key} onChange={(e) => setNewColor((f) => ({ ...f, color_key: e.target.value }))} required />
            <input placeholder="שם" value={newColor.name} onChange={(e) => setNewColor((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <label style={{ fontSize: "0.85rem" }}>עץ <input type="color" value={newColor.wood} onChange={(e) => setNewColor((f) => ({ ...f, wood: e.target.value }))} /></label>
            <label style={{ fontSize: "0.85rem" }}>מסגרת <input type="color" value={newColor.trim} onChange={(e) => setNewColor((f) => ({ ...f, trim: e.target.value }))} /></label>
            <label style={{ fontSize: "0.85rem" }}>סווטש <input type="color" value={newColor.swatch} onChange={(e) => setNewColor((f) => ({ ...f, swatch: e.target.value }))} /></label>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit">צור</button>
            <button type="button" onClick={() => setCreating(false)}>ביטול</button>
          </div>
        </form>
      )}
      <div className="palette-list">
        {colors.map((c) => (
          <div key={c.id} className="palette-row">
            <div className="color-swatch" style={{ background: c.swatch }} />
            <span className="row-name">{c.name}</span>
            <span className="row-key">{c.color_key}</span>
            <button className="row-delete-btn" onClick={() => handleDelete(c.id)} aria-label="מחק"><X /></button>
          </div>
        ))}
      </div>
      {dialog}
    </div>
  );
}
