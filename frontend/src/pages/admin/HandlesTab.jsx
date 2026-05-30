import { useEffect, useState } from "react";
import { adminCreateHandle, adminDeleteHandle, adminGetHandles } from "../../api.js";
import { useConfirm } from "./useConfirm.jsx";
import "./AdminTab.css";

export default function HandlesTab() {
  const { confirm, dialog } = useConfirm();
  const [handles, setHandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newHandle, setNewHandle] = useState({ handle_key: "", name: "", color: "#cccccc", finish: "matte", door_kind: "both" });

  useEffect(() => { load(); }, []);

  async function load() {
    try { setHandles(await adminGetHandles()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const h = await adminCreateHandle(newHandle);
      setHandles((prev) => [...prev, h]);
      setCreating(false);
      setNewHandle({ handle_key: "", name: "", color: "#cccccc", finish: "matte", door_kind: "both" });
    } catch (e) { setError(e.message); }
  }

  async function handleDelete(id) {
    if (!await confirm("למחוק את הידית?")) return;
    try {
      await adminDeleteHandle(id);
      setHandles((prev) => prev.filter((h) => h.id !== id));
    } catch (e) { setError(e.message); }
  }

  if (loading) return <div className="tab-loading">טוען...</div>;

  return (
    <div className="admin-tab-content">
      <div className="tab-toolbar">
        <h2>ידיות</h2>
        <button className="btn-add" onClick={() => setCreating(true)}>+ חדש</button>
      </div>
      {error && <p className="tab-error">{error}</p>}
      {creating && (
        <form onSubmit={handleCreate} className="create-form" style={{ flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input placeholder="מפתח (handle_key)" value={newHandle.handle_key} onChange={(e) => setNewHandle((f) => ({ ...f, handle_key: e.target.value }))} required />
            <input placeholder="שם" value={newHandle.name} onChange={(e) => setNewHandle((f) => ({ ...f, name: e.target.value }))} required />
            <label style={{ fontSize: "0.85rem" }}>צבע <input type="color" value={newHandle.color} onChange={(e) => setNewHandle((f) => ({ ...f, color: e.target.value }))} /></label>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <label style={{ fontSize: "0.85rem" }}>
              גימור
              <select value={newHandle.finish} onChange={(e) => setNewHandle((f) => ({ ...f, finish: e.target.value }))}>
                <option value="matte">מט</option>
                <option value="metallic">מתכתי</option>
              </select>
            </label>
            <label style={{ fontSize: "0.85rem" }}>
              סוג דלת
              <select value={newHandle.door_kind} onChange={(e) => setNewHandle((f) => ({ ...f, door_kind: e.target.value }))}>
                <option value="both">הכל</option>
                <option value="hinged">צירים</option>
                <option value="sliding">הזזה</option>
              </select>
            </label>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit">צור</button>
            <button type="button" onClick={() => setCreating(false)}>ביטול</button>
          </div>
        </form>
      )}
      <div className="handles-list">
        {handles.map((h) => (
          <div key={h.id} className="handle-row">
            <div className="handle-dot" style={{ background: h.color }} />
            <span className="row-name">{h.name}</span>
            <span className="row-key">{h.handle_key} · {h.finish} · {h.door_kind}</span>
            <button className="row-delete-btn" onClick={() => handleDelete(h.id)}>✕</button>
          </div>
        ))}
      </div>
      {dialog}
    </div>
  );
}
