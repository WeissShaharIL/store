import { lazy, Suspense, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import FormaLogo from "../components/FormaLogo.jsx";
import LeadsTab from "./admin/LeadsTab.jsx";
import LandingSettingsTab from "./admin/LandingSettingsTab.jsx";
import SettingsTab from "./admin/SettingsTab.jsx";
import ImagesTab from "./admin/ImagesTab.jsx";
import ActivityTab from "./admin/ActivityTab.jsx";
import { usePolling } from "../hooks/usePolling.js";
import { adminGetLeadsUnreadCount } from "../api.js";
import "../styles/chat.css";
import "./AdminDashboard.css";

const PituchTab = lazy(() => import("./admin/PituchTab.jsx"));

const TABS = [
  { id: "settings",  label: "הגדרות" },
  { id: "images",    label: "תמונות" },
  { id: "landing",   label: "דף הבית" },
  { id: "leads",     label: "פניות" },
  { id: "activity",  label: "פעילות" },
  { id: "pituch",    label: "פיתוח" },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("settings");
  const [leadsUnread, setLeadsUnread] = useState(0);

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
        {activeTab === "activity" && <ActivityTab />}
        {activeTab === "pituch"   && <Suspense fallback={<div style={{padding:"2rem",color:"rgba(255,255,255,0.35)"}}>טוען...</div>}><PituchTab /></Suspense>}
        {activeTab === "leads"    && <LeadsTab />}
        {activeTab === "landing"  && <LandingSettingsTab />}
        {activeTab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}
