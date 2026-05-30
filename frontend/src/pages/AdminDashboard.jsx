import { lazy, Suspense, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import FormaLogo from "../components/FormaLogo.jsx";
import LeadsTab from "./admin/LeadsTab.jsx";
import LandingSettingsTab from "./admin/LandingSettingsTab.jsx";
import SettingsTab from "./admin/SettingsTab.jsx";
const PituchTab = lazy(() => import("./admin/PituchTab.jsx"));
import ImagesTab from "./admin/ImagesTab.jsx";
import { usePolling } from "../hooks/usePolling.js";
import { adminGetLeadsUnreadCount, adminChangePassword } from "../api.js";
import "../styles/chat.css";
import "./AdminDashboard.css";

const TABS = [
  { id: "settings", label: "הגדרות" },
  { id: "images",   label: "תמונות" },
  { id: "landing",  label: "דף הבית" },
  { id: "leads",    label: "פניות" },
  { id: "pituch",   label: "פיתוח" },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pituch");
  const [leadsUnread, setLeadsUnread] = useState(0);

  // Change password state
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

  const fetchLeadsUnread = useCallback(async () => {
    const r = await adminGetLeadsUnreadCount();
    setLeadsUnread(r.count || 0);
  }, []);

  usePolling(fetchLeadsUnread, { intervalMs: 30_000, onVisible: true, deps: [fetchLeadsUnread] });

  async function handleLogout() {
    await logout();
    navigate("/admin");
  }

  return (
    <div className="admin">
      <header className="admin-header">
        <div className="admin-header__brand">
          <FormaLogo />
          <span className="admin-title">ניהול</span>
        </div>
        <button onClick={handleLogout} className="admin-logout-btn">יציאה</button>
      </header>

      <nav className="admin-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`admin-tab${activeTab === tab.id ? " active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.id === "leads" && leadsUnread > 0 && (
              <span className="badge badge--inline">{leadsUnread}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="admin-content">
        {activeTab === "images"   && <ImagesTab />}
        {activeTab === "pituch"   && <Suspense fallback={<div style={{padding:"2rem",color:"rgba(255,255,255,0.35)"}}>טוען...</div>}><PituchTab /></Suspense>}
        {activeTab === "leads"    && <LeadsTab />}
        {activeTab === "landing"  && <LandingSettingsTab />}
        {activeTab === "settings" && (
          <>
            <SettingsTab />
            <section className="admin-change-password">
              <h3 className="admin-change-password__title">שינוי סיסמה</h3>
              <form onSubmit={handleChangePassword} className="admin-change-password__form">
                <input
                  type="password"
                  placeholder="סיסמה נוכחית"
                  value={cpCurrent}
                  onChange={(e) => setCpCurrent(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="סיסמה חדשה"
                  value={cpNew}
                  onChange={(e) => setCpNew(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="אימות סיסמה חדשה"
                  value={cpConfirm}
                  onChange={(e) => setCpConfirm(e.target.value)}
                  required
                />
                {cpError && <p className="admin-change-password__error">{cpError}</p>}
                {cpDone && <p className="admin-change-password__ok">הסיסמה שונתה בהצלחה ✓</p>}
                <button type="submit" disabled={cpLoading} className="btn btn--primary btn--sm">
                  {cpLoading ? "שומר..." : "שמור סיסמה"}
                </button>
              </form>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
