import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import ClosetTemplatesTab from "./admin/ClosetTemplatesTab.jsx";
import LeadsTab from "./admin/LeadsTab.jsx";
import ColorsTab from "./admin/ColorsTab.jsx";
import HandlesTab from "./admin/HandlesTab.jsx";
import LandingSettingsTab from "./admin/LandingSettingsTab.jsx";
import SettingsTab from "./admin/SettingsTab.jsx";
import "./AdminDashboard.css";

const TABS = [
  { id: "templates", label: "ארונות" },
  { id: "leads", label: "פניות" },
  { id: "colors", label: "צבעים" },
  { id: "handles", label: "ידיות" },
  { id: "landing", label: "דף בית" },
  { id: "settings", label: "הגדרות" },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("templates");

  async function handleLogout() {
    await logout();
    navigate("/admin");
  }

  return (
    <div className="admin">
      <header className="admin-header">
        <span className="admin-title">ניהול | Store</span>
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
        {activeTab === "templates" && <ClosetTemplatesTab />}
        {activeTab === "leads" && <LeadsTab />}
        {activeTab === "colors" && <ColorsTab />}
        {activeTab === "handles" && <HandlesTab />}
        {activeTab === "landing" && <LandingSettingsTab />}
        {activeTab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}
