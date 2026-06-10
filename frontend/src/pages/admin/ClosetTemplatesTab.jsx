import { useEffect, useState } from "react";
import {
  adminCreateTemplate,
  adminDeleteTemplate,
  adminDeleteTemplateImage,
  adminGetTemplates,
  adminUpdateTemplate,
  adminUploadTemplateImage,
} from "../../api.js";
import { useConfirm } from "./useConfirm.jsx";
import { Image, Upload, X } from "../../components/Icons.jsx";
import "./AdminTab.css";

export default function ClosetTemplatesTab() {
  const { confirm, dialog } = useConfirm();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await adminGetTemplates();
      setTemplates(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const t = await adminCreateTemplate({
        name: newName.trim(),
        config_json: JSON.stringify({ doorKind: "hinged", color: "white", handleColor: "silver", width: 200, height: 240, depth: 60, columns: [], rows: 3 }),
      });
      setTemplates((prev) => [t, ...prev]);
      setNewName("");
      setCreating(false);
    } catch (e) {
      setError(e.message);
    }
  }

  async function toggleReady(t) {
    try {
      const updated = await adminUpdateTemplate(t.id, { is_ready: !t.is_ready });
      setTemplates((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function toggleDisplaySale(t) {
    try {
      const updated = await adminUpdateTemplate(t.id, { is_display_sale: !t.is_display_sale });
      setTemplates((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleImageUpload(t, file) {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const updated = await adminUploadTemplateImage(t.id, fd);
      setTemplates((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(id) {
    if (!await confirm("למחוק את התבנית?")) return;
    try {
      await adminDeleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) return <div className="tab-loading">טוען...</div>;

  return (
    <div className="admin-tab-content">
      <div className="tab-toolbar">
        <h2>תבניות ארונות</h2>
        <button className="btn-add" onClick={() => setCreating(true)}>+ חדש</button>
      </div>

      {error && <p className="tab-error">{error}</p>}

      {creating && (
        <form onSubmit={handleCreate} className="create-form">
          <input
            autoFocus
            placeholder="שם התבנית"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button type="submit">צור</button>
          <button type="button" onClick={() => setCreating(false)}>ביטול</button>
        </form>
      )}

      <div className="templates-grid">
        {templates.map((t) => (
          <div key={t.id} className="template-card">
            <div className="template-image">
              {t.image_path ? (
                <img src={`/uploads/${t.image_path}`} alt={t.name} />
              ) : (
                <div className="template-placeholder"><Image /></div>
              )}
              <label className="image-upload-btn" title="העלה תמונה">
                <Upload />
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => e.target.files[0] && handleImageUpload(t, e.target.files[0])}
                />
              </label>
            </div>
            <div className="template-info">
              <span className="template-name">{t.name}</span>
              <div className="template-flags">
                <label className="flag-toggle">
                  <input type="checkbox" checked={t.is_ready} onChange={() => toggleReady(t)} />
                  פורסם
                </label>
                <label className="flag-toggle">
                  <input type="checkbox" checked={t.is_display_sale} onChange={() => toggleDisplaySale(t)} />
                  מתצוגה
                </label>
              </div>
              {t.is_display_sale && (
                <PriceEditor template={t} onChange={(updated) => setTemplates((prev) => prev.map((x) => (x.id === t.id ? updated : x)))} />
              )}
            </div>
            <button className="template-delete-btn" onClick={() => handleDelete(t.id)} title="מחק" aria-label="מחק"><X /></button>
          </div>
        ))}
      </div>
      {dialog}
    </div>
  );
}

function PriceEditor({ template, onChange }) {
  const [price, setPrice] = useState(template.display_sale_price || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const updated = await adminUpdateTemplate(template.id, { display_sale_price: price });
      onChange(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="price-editor">
      <input
        placeholder="מחיר מתצוגה"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        onBlur={save}
      />
    </div>
  );
}
