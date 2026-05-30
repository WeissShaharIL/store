import { lazy, Suspense, useEffect, useState } from "react";
import {
  adminDeleteLead,
  adminGetLeads,
  adminGetTrashedLeads,
  adminRestoreLead,
  adminUpdateLead,
  adminGetLeadCounts,
  adminExportLeadsCsv,
} from "../../api.js";
import { parseConfig } from "../../lib/parseConfig.js";
import "./AdminTab.css";

// Lazy so three.js loads only when an admin opens a 3D preview.
const LeadClosetPreview = lazy(() => import("./LeadClosetPreview.jsx"));

function hasRenderableConfig(item) {
  const cfg = parseConfig(item.config_json);
  return (cfg.doors?.length ?? 0) > 0;
}

const INTERIOR_LABELS = { shelf: "מדף", rod: "מוט תלייה", drawer: "מגירה" };

function cartItemSummary(item) {
  const snap = item.snapshot;
  const cfg = parseConfig(item.config_json);
  const dims = snap?.customDims ?? cfg.dimensions;
  const doors = cfg.doors ?? [];
  const parts = [];
  if (dims) {
    const widthCm = Math.round((dims.compartmentWidth ?? 80) * Math.max(1, doors.length));
    parts.push(`${widthCm}×${dims.H}×${dims.D} ס״מ`);
  }
  if (doors.length) parts.push(`${doors.length} דלתות`);
  const color = snap?.customColor ?? cfg.color;
  if (color) parts.push(color);
  if (item.displaySalePrice) parts.push(`₪${Number(item.displaySalePrice).toLocaleString()}`);
  return parts.join(" · ");
}

// Stage-2 interior plan: snapshot.customItems is { doorId: [{ type, y }, ...] }.
// Returns e.g. "3 מדפים · 1 מוט תלייה · 2 מגירות" or "" if nothing was placed.
function interiorSummary(item) {
  const byDoor = item.snapshot?.customItems;
  if (!byDoor || typeof byDoor !== "object") return "";
  const counts = {};
  for (const list of Object.values(byDoor)) {
    if (!Array.isArray(list)) continue;
    for (const it of list) {
      if (!it?.type) continue;
      counts[it.type] = (counts[it.type] || 0) + 1;
    }
  }
  const order = ["shelf", "rod", "drawer"];
  return order
    .filter((t) => counts[t])
    .map((t) => `${counts[t]} ${INTERIOR_LABELS[t] || t}`)
    .join(" · ");
}

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
  const [counts, setCounts] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [preview, setPreview] = useState(null); // cart item being shown in 3D

  useEffect(() => {
    load();
  }, [filter]);

  useEffect(() => {
    adminGetLeadCounts().then(setCounts).catch(() => {});
  }, [leads]);

  async function load() {
    setLoading(true);
    setError("");
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

  async function handleExport() {
    setExporting(true);
    try {
      await adminExportLeadsCsv();
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(false);
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
        <button className="btn btn--ghost btn--sm" onClick={handleExport} disabled={exporting}>
          {exporting ? "מייצא..." : "ייצא ל-CSV"}
        </button>
      </div>

      {counts && (
        <div className="leads-counts">
          <span className="leads-counts__item"><strong>{counts.all}</strong> סה״כ</span>
          <span className="leads-counts__item leads-counts__item--new"><strong>{counts.new}</strong> חדשות</span>
          <span className="leads-counts__item"><strong>{counts.contacted}</strong> בטיפול</span>
          <span className="leads-counts__item"><strong>{counts.closed}</strong> סגורות</span>
        </div>
      )}

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
              <a className="lead-phone" href={`tel:${l.phone}`}>{l.phone}</a>
              {l.email && <div className="lead-detail">✉️ {l.email}</div>}
              {l.address && <div className="lead-detail">📍 {l.address}</div>}
              {l.notes && <div className="lead-detail lead-detail--notes">📝 {l.notes}</div>}
              {l.cart?.length > 0 ? (
                <div className="lead-cart">
                  <div className="lead-cart__title">פריטים שנבחרו ({l.cart.length})</div>
                  <ul className="lead-cart__list">
                    {l.cart.map((item, i) => {
                      const summary = cartItemSummary(item);
                      const interior = interiorSummary(item);
                      return (
                        <li key={item.id || i} className="lead-cart__item">
                          <span className="lead-cart__name">
                            {item.snapshot && <span className="lead-cart__badge">מותאם</span>}
                            {item.name || "ארון"}
                          </span>
                          {summary && <span className="lead-cart__summary">{summary}</span>}
                          {interior && (
                            <span className="lead-cart__interior">🗄️ פנים הארון: {interior}</span>
                          )}
                          {hasRenderableConfig(item) && (
                            <button
                              type="button"
                              className="lead-action-btn"
                              onClick={() => setPreview(item)}
                            >
                              צפה בתלת-מימד
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <div className="lead-cart-count">אין פריטים בסל</div>
              )}
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

      {preview && (
        <Suspense fallback={null}>
          <LeadClosetPreview item={preview} onClose={() => setPreview(null)} />
        </Suspense>
      )}
    </div>
  );
}
