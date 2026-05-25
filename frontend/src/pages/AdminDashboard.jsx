import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import FormaLogo from "../components/FormaLogo.jsx";
import LeadsTab from "./admin/LeadsTab.jsx";
import LandingSettingsTab from "./admin/LandingSettingsTab.jsx";
import SettingsTab from "./admin/SettingsTab.jsx";
import PituchTab from "./admin/PituchTab.jsx";
import "./AdminDashboard.css";

const TABS = [
  { id: "pituch",   label: "פיתוח" },
  { id: "leads",    label: "פניות" },
  { id: "landing",  label: "דף בית" },
  { id: "settings", label: "הגדרות" },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pituch");

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
          </button>
        ))}
      </nav>

      <div className="admin-content">
        {activeTab === "pituch"   && <PituchTab />}
        {activeTab === "leads"    && <LeadsTab />}
        {activeTab === "landing"  && <LandingSettingsTab />}
        {activeTab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}
