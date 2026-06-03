import { lazy, Suspense, useCallback, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import FormaLogo from "../components/FormaLogo.jsx";
import LeadsTab from "./admin/LeadsTab.jsx";
import LandingSettingsTab from "./admin/LandingSettingsTab.jsx";
import SettingsTab from "./admin/SettingsTab.jsx";
import ImagesTab from "./admin/ImagesTab.jsx";
import ActivityTab from "./admin/ActivityTab.jsx";
import OrdersTab from "./admin/OrdersTab.jsx";
import { usePolling } from "../hooks/usePolling.js";
import { adminGetLeadsUnreadCount } from "../api.js";
import TourOverlay from "./admin/TourOverlay.jsx";
import "../styles/chat.css";
import "./AdminDashboard.css";

// Lazy so the heavy three.js builder bundle loads only when opened.
const PituchTab = lazy(() => import("./admin/PituchTab.jsx"));

const TABS = [
  { id: "settings",  label: "הגדרות" },
  { id: "images",    label: "תמונות" },
  { id: "landing",   label: "דף הבית" },
  { id: "leads",     label: "פניות" },
  { id: "orders",    label: "הזמנות" },
  { id: "activity",  label: "פעילות" },
  { id: "pituch",    label: "פיתוח" },
];

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("settings");
  const [pituchSubTab, setPituchSubTab] = useState(null);
  const [tourActive, setTourActive] = useState(false);
  const [leadsUnread, setLeadsUnread] = useState(0);
  const [ordersRefresh, setOrdersRefresh] = useState(0);

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
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button className="admin-logout-btn" style={{ background: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.3)", color: "rgb(134,239,172)" }} onClick={() => setTourActive(true)}>
            סיור
          </button>
          <button onClick={handleLogout} className="admin-logout-btn">יציאה</button>
        </div>
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
        {activeTab === "images"    && <ImagesTab />}
        {activeTab === "activity"  && <ActivityTab />}
        {activeTab === "pituch"    && <Suspense fallback={<div style={{padding:"2rem",color:"rgba(255,255,255,0.35)"}}>טוען...</div>}><PituchTab externalSubTab={pituchSubTab} /></Suspense>}
        {activeTab === "leads"     && <LeadsTab onOrderCreated={() => { setOrdersRefresh((n) => n + 1); setActiveTab("orders"); }} />}
        {activeTab === "orders"    && <OrdersTab key={ordersRefresh} />}
        {activeTab === "landing"   && <LandingSettingsTab />}
        {activeTab === "settings"  && <SettingsTab onStartTour={() => setTourActive(true)} />}
      </div>
      {tourActive && (
        <TourOverlay
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setPituchSubTab={setPituchSubTab}
          onClose={() => { setTourActive(false); setPituchSubTab(null); }}
        />
      )}
    </div>
  );
}
