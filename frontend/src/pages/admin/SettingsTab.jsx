import { useEffect, useState } from "react";
import { adminActivateLogo, adminDeleteLogo, adminGetLogos, adminUploadLogo, adminChangePassword, getSettings, updateSettings } from "../../api.js";
import { useConfirm } from "./useConfirm.jsx";
import "./AdminTab.css";

const TOUR_KEY = "admin-tour-enabled";

export default function SettingsTab({ onStartTour }) {
  const { confirm, dialog } = useConfirm();
  const [logos, setLogos] = useState([]);
  const [error, setError] = useState("");
  const [tourEnabled, setTourEnabled] = useState(() => localStorage.getItem(TOUR_KEY) !== "false");

  function toggleTour(val) {
    setTourEnabled(val);
    localStorage.setItem(TOUR_KEY, val ? "true" : "false");
  }

  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState("");
  const [cpDone, setCpDone] = useState(false);

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

      <section className="settings-section">
        <div className="settings-section__head">
          <h3>שינוי סיסמה</h3>
        </div>
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
          {cpDone && <p style={{ color: "#86efac", fontSize: "0.82rem", margin: 0 }}>הסיסמה שונתה בהצלחה ✓</p>}
          <button type="submit" disabled={cpLoading} className="settings-save-btn">
            {cpLoading ? "שומר..." : "שמור סיסמה"}
          </button>
        </form>
      </section>

      <section id="tour-section" className="settings-section">
        <div className="settings-section__head">
          <h3>סיור מודרך</h3>
          <p className="settings-section__sub" style={{ marginTop: 4, fontSize: "0.82rem", color: "rgba(255,255,255,0.4)" }}>
            הפעל כדי שכפתור "סיור" יופיע בכותרת לוח הניהול.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", userSelect: "none" }}>
            <span style={{ position: "relative", display: "inline-block", width: 36, height: 20 }}>
              <input type="checkbox" checked={tourEnabled} onChange={(e) => toggleTour(e.target.checked)} style={{ display: "none" }} />
              <span style={{
                display: "block", width: 36, height: 20, borderRadius: 999,
                background: tourEnabled ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.12)",
                border: `1px solid ${tourEnabled ? "rgba(34,197,94,0.5)" : "rgba(255,255,255,0.15)"}`,
                transition: "background 200ms",
                position: "relative",
              }}>
                <span style={{
                  position: "absolute", top: 2,
                  right: tourEnabled ? 2 : undefined,
                  left: tourEnabled ? undefined : 2,
                  width: 14, height: 14, borderRadius: "50%",
                  background: tourEnabled ? "rgb(134,239,172)" : "rgba(255,255,255,0.4)",
                  transition: "left 200ms, right 200ms, background 200ms",
                }} />
              </span>
            </span>
            <span style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.65)" }}>
              {tourEnabled ? "מופעל" : "כבוי"}
            </span>
          </label>
          {tourEnabled && (
            <button className="btn btn--ghost btn--sm" onClick={onStartTour}>
              התחל סיור עכשיו
            </button>
          )}
        </div>
      </section>

      {dialog}
    </div>
  );
}
