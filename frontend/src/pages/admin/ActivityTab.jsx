import { useCallback, useEffect, useState } from "react";
import { adminGetActivity } from "../../api.js";
import "./AdminTab.css";
import "./AdminActivity.css";

const ACTION_META = {
  lead_submitted:     { icon: "📬", color: "green",  label: "פנייה חדשה" },
  admin_login:        { icon: "🔑", color: "blue",   label: "כניסת מנהל" },
  admin_login_failed: { icon: "⚠️", color: "red",    label: "ניסיון כניסה נכשל" },
  template_created:   { icon: "➕", color: "blue",   label: "תבנית נוצרה" },
  template_updated:   { icon: "✏️", color: "muted",  label: "תבנית עודכנה" },
  template_deleted:   { icon: "🗑️", color: "red",    label: "תבנית נמחקה" },
  image_uploaded:     { icon: "🖼️", color: "muted",  label: "תמונה הועלתה" },
};

const ACTIONS = Object.entries(ACTION_META).map(([k, v]) => ({ value: k, label: v.label }));

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "עכשיו";
  if (m < 60) return `לפני ${m} דק׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `לפני ${h} שע׳`;
  const d = Math.floor(h / 24);
  return `לפני ${d} ימים`;
}

export default function ActivityTab() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterAction, setFilterAction] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await adminGetActivity({ action: filterAction || undefined, limit: 200 });
      setEvents(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filterAction]);

  useEffect(() => { load(); }, [load]);

  const hasFailedAdmin = events.some((e) => e.action === "admin_login_failed");

  return (
    <div className="admin-tab-content">
      {hasFailedAdmin && (
        <div className="activity-alert">
          ⚠️ נרשם ניסיון כניסה נכשל לחשבון מנהל
        </div>
      )}

      <div className="tab-toolbar">
        <h2>פעילות</h2>
        <div className="activity-controls">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="activity-filter"
          >
            <option value="">כל הפעולות</option>
            {ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
          <button className="btn btn--ghost btn--sm" onClick={load}>רענן</button>
        </div>
      </div>

      {error && <p className="tab-error">{error}</p>}

      {loading ? (
        <p className="tab-loading">טוען...</p>
      ) : events.length === 0 ? (
        <p className="tab-loading">אין פעילות להצגה</p>
      ) : (
        <ul className="activity-list">
          {events.map((ev) => {
            const meta = ACTION_META[ev.action] ?? { icon: "•", color: "muted", label: ev.action_label };
            return (
              <li key={ev.id} className={`activity-item activity-item--${meta.color}`}>
                <span className="activity-item__icon">{meta.icon}</span>
                <div className="activity-item__body">
                  <span className="activity-item__label">{meta.label}</span>
                  {ev.actor && <span className="activity-item__actor">{ev.actor}</span>}
                  {ev.details && <ActivityDetails action={ev.action} details={ev.details} />}
                </div>
                <div className="activity-item__meta">
                  <span className="activity-item__time" title={new Date(ev.created_at).toLocaleString("he-IL")}>
                    {timeAgo(ev.created_at)}
                  </span>
                  {ev.ip && <span className="activity-item__ip">{ev.ip}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ActivityDetails({ action, details }) {
  if (action === "lead_submitted") {
    return (
      <span className="activity-item__detail">
        {details.phone}{details.items > 0 ? ` · ${details.items} פריט${details.items !== 1 ? "ים" : ""}` : ""}
      </span>
    );
  }
  if (action === "admin_login_failed") {
    return <span className="activity-item__detail">ניסיון: {details.customer_id}</span>;
  }
  if (details.name) {
    return <span className="activity-item__detail">{details.name}</span>;
  }
  return null;
}
