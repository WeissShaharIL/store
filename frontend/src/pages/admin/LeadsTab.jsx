import { useEffect, useState } from "react";
import {
  adminDeleteLead,
  adminGetLeads,
  adminGetTrashedLeads,
  adminRestoreLead,
  adminUpdateLead,
} from "../../api.js";
import "./AdminTab.css";

const STATUS_LABELS = { new: "חדש", contacted: "נוצר קשר", closed: "סגור" };
const FILTERS = [
  { id: "all", label: "הכל" },
  { id: "new", label: "חדש" },
  { id: "contacted", label: "נוצר קשר" },
  { id: "closed", label: "סגור" },
  { id: "trash", label: "אשפה" },
];

export default function LeadsTab() {
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, [filter]);

  async function load() {
    setLoading(true);
    try {
      const data =
        filter === "trash"
          ? await adminGetTrashedLeads()
          : await adminGetLeads(filter === "all" ? undefined : filter);
      setLeads(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(id, status) {
    try {
      const updated = await adminUpdateLead(id, { status });
      setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function trash(id) {
    try {
      await adminDeleteLead(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  async function restore(id) {
    try {
      const updated = await adminRestoreLead(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="admin-tab-content">
      <div className="tab-toolbar">
        <h2>פניות</h2>
      </div>

      {error && <p className="tab-error">{error}</p>}

      <div className="leads-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`leads-filter-btn${filter === f.id ? " active" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="tab-loading">טוען...</div>
      ) : leads.length === 0 ? (
        <div className="tab-loading">אין פניות</div>
      ) : (
        <div className="leads-list">
          {leads.map((l) => (
            <div key={l.id} className="lead-card">
              <div className="lead-card-header">
                <span className="lead-name">{l.name}</span>
                <span className={`lead-status ${l.status}`}>{STATUS_LABELS[l.status]}</span>
              </div>
              <span className="lead-phone">{l.phone}</span>
              {l.email && <span className="lead-date">{l.email}</span>}
              <span className="lead-cart-count">{l.cart?.length || 0} פריטים בסל</span>
              <span className="lead-date">
                {new Date(l.created_at).toLocaleDateString("he-IL")}
              </span>
              <div className="lead-actions">
                {filter !== "trash" && (
                  <>
                    {l.status !== "contacted" && (
                      <button className="lead-action-btn" onClick={() => setStatus(l.id, "contacted")}>
                        נוצר קשר
                      </button>
                    )}
                    {l.status !== "closed" && (
                      <button className="lead-action-btn" onClick={() => setStatus(l.id, "closed")}>
                        סגור
                      </button>
                    )}
                    <button className="lead-action-btn danger" onClick={() => trash(l.id)}>
                      מחק
                    </button>
                  </>
                )}
                {filter === "trash" && (
                  <button className="lead-action-btn" onClick={() => restore(l.id)}>
                    שחזר
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
