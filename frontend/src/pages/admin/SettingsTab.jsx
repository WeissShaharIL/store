import { useEffect, useState } from "react";
import { adminActivateLogo, adminDeleteLogo, adminGetLogos, adminUploadLogo, getSettings, updateSettings } from "../../api.js";
import { useConfirm } from "./useConfirm.jsx";
import "./AdminTab.css";

export default function SettingsTab() {
  const { confirm, dialog } = useConfirm();
  const [logos, setLogos] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    adminGetLogos().then(setLogos).catch((e) => setError(e.message));
  }, []);

  async function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", file.name);
    try {
      const logo = await adminUploadLogo(fd);
      setLogos((prev) => [logo, ...prev]);
    } catch (e) {
      setError(e.message);
    }
    e.target.value = "";
  }

  async function handleActivate(id) {
    try {
      const updated = await adminActivateLogo(id);
      setLogos((prev) => prev.map((l) => ({ ...l, is_active: l.id === id })));
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDeleteLogo(id) {
    if (!await confirm("למחוק?")) return;
    try {
      await adminDeleteLogo(id);
      setLogos((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="admin-tab-content">
      <div className="tab-toolbar">
        <h2>הגדרות</h2>
      </div>
      {error && <p className="tab-error">{error}</p>}

      <section>
        <div className="tab-toolbar" style={{ marginBottom: "0.75rem" }}>
          <h3 style={{ margin: 0, fontSize: "0.95rem" }}>לוגו</h3>
          <label className="btn-add" style={{ cursor: "pointer" }}>
            + העלה לוגו
            <input type="file" accept="image/*" hidden onChange={handleLogoUpload} />
          </label>
        </div>
        <div className="palette-list">
          {logos.map((l) => (
            <div key={l.id} className="palette-row">
              <img src={`/uploads/${l.image_path}`} alt={l.name} style={{ height: 32, objectFit: "contain" }} />
              <span className="row-name">{l.name || l.image_path}</span>
              {l.is_active && <span style={{ fontSize: "0.75rem", color: "#27ae60", fontWeight: 700 }}>פעיל</span>}
              {!l.is_active && (
                <button className="lead-action-btn" onClick={() => handleActivate(l.id)}>הפעל</button>
              )}
              {!l.is_active && (
                <button className="row-delete-btn" onClick={() => handleDeleteLogo(l.id)}>✕</button>
              )}
            </div>
          ))}
        </div>
      </section>
      {dialog}
    </div>
  );
}
