import { lazy, Suspense, useEffect, useState } from "react";
import {
  adminGetOrders,
  adminGetOrderCounts,
  adminUpdateOrder,
  adminDeleteOrder,
  adminExportOrdersCsv,
} from "../../api.js";
import { parseConfig } from "../../lib/parseConfig.js";
import { useConfirm } from "./useConfirm.jsx";
import { MapPin, Mail } from "../../components/Icons.jsx";
import "./AdminTab.css";
import "./AdminOrders.css";

const LeadClosetPreview = lazy(() => import("./LeadClosetPreview.jsx"));

const STATUS_LABELS = {
  new: "חדשה",
  in_production: "בייצור",
  ready: "מוכנה",
  delivered: "נמסרה",
  cancelled: "בוטלה",
};
const STATUS_FLOW = ["new", "in_production", "ready", "delivered", "cancelled"];

function hasRenderableConfig(item) {
  const cfg = parseConfig(item.config_json);
  return (cfg.doors?.length ?? 0) > 0;
}

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
  return parts.join(" · ");
}

export default function OrdersTab() {
  const { confirm, dialog } = useConfirm();
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [preview, setPreview] = useState(null);

  // filters
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  function load(overrides = {}) {
    const status = "statusFilter" in overrides ? overrides.statusFilter : statusFilter;
    const q = "search" in overrides ? overrides.search : search;
    const from = "dateFrom" in overrides ? overrides.dateFrom : dateFrom;
    const to = "dateTo" in overrides ? overrides.dateTo : dateTo;
    setLoading(true);
    setError("");
    adminGetOrders({
      status: status || undefined,
      q: q.trim() || undefined,
      dateFrom: from || undefined,
      dateTo: to || undefined,
    })
      .then(setOrders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  // Reload on status/date change immediately; search is applied via the form.
  useEffect(() => { load(); }, [statusFilter, dateFrom, dateTo]);
  useEffect(() => { adminGetOrderCounts().then(setCounts).catch(() => {}); }, [orders]);

  async function changeStatus(id, status) {
    try {
      const updated = await adminUpdateOrder(id, { status });
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(id) {
    if (!await confirm("למחוק את ההזמנה לצמיתות?")) return;
    try {
      await adminDeleteOrder(id);
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleExport() {
    setExporting(true);
    try { await adminExportOrdersCsv(); }
    catch (e) { setError(e.message); }
    finally { setExporting(false); }
  }

  function onSearchSubmit(e) {
    e.preventDefault();
    load();
  }

  return (
    <div className="admin-tab-content">
      <div className="tab-toolbar">
        <h2>הזמנות</h2>
        <button className="btn btn--ghost btn--sm" onClick={handleExport} disabled={exporting}>
          {exporting ? "מייצא..." : "ייצא ל-CSV"}
        </button>
      </div>

      {counts && (
        <div className="leads-counts">
          <span className="leads-counts__item"><strong>{counts.all}</strong> סה״כ</span>
          {STATUS_FLOW.map((s) => (
            <span key={s} className="leads-counts__item"><strong>{counts[s] ?? 0}</strong> {STATUS_LABELS[s]}</span>
          ))}
        </div>
      )}

      {error && <p className="tab-error">{error}</p>}

      {/* Filters */}
      <div className="orders-filters">
        <div className="leads-filters">
          <button
            className={`leads-filter-btn${statusFilter === "" ? " active" : ""}`}
            onClick={() => setStatusFilter("")}
          >הכל</button>
          {STATUS_FLOW.map((s) => (
            <button
              key={s}
              className={`leads-filter-btn${statusFilter === s ? " active" : ""}`}
              onClick={() => setStatusFilter(s)}
            >{STATUS_LABELS[s]}</button>
          ))}
        </div>
        <form className="orders-filters__row" onSubmit={onSearchSubmit}>
          <input
            type="search"
            className="orders-filters__input"
            placeholder="חיפוש שם או טלפון"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="orders-filters__date">
            מתאריך
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </label>
          <label className="orders-filters__date">
            עד תאריך
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </label>
          <button type="submit" className="lead-action-btn">חפש</button>
          {(search || dateFrom || dateTo || statusFilter) && (
            <button
              type="button"
              className="lead-action-btn"
              onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setStatusFilter(""); load({ search: "", dateFrom: "", dateTo: "", statusFilter: "" }); }}
            >נקה</button>
          )}
        </form>
      </div>

      {loading ? (
        <div className="tab-loading">טוען...</div>
      ) : orders.length === 0 ? (
        <div className="tab-loading">אין הזמנות</div>
      ) : (
        <div className="leads-list">
          {orders.map((o) => (
            <div key={o.id} className="lead-card">
              <div className="lead-card-header">
                <span className="lead-name">#{o.id} · {o.customer_name}</span>
                <span className={`order-status order-status--${o.status}`}>{STATUS_LABELS[o.status] || o.status}</span>
              </div>
              <a className="lead-phone" href={`tel:${o.phone}`}>{o.phone}</a>
              {o.email && <div className="lead-detail"><Mail /> {o.email}</div>}
              {o.address && <div className="lead-detail"><MapPin /> {o.address}</div>}
              {o.total_amount != null && (
                <div className="lead-detail lead-detail--total">₪{Number(o.total_amount).toLocaleString()}</div>
              )}

              {o.cart?.length > 0 && (
                <div className="lead-cart">
                  <div className="lead-cart__title">פריטים ({o.cart.length})</div>
                  <ul className="lead-cart__list">
                    {o.cart.map((item, i) => {
                      const summary = cartItemSummary(item);
                      return (
                        <li key={item.id || i} className="lead-cart__item">
                          <span className="lead-cart__name">
                            {item.snapshot && <span className="lead-cart__badge">מותאם</span>}
                            {item.name || "ארון"}
                          </span>
                          {summary && <span className="lead-cart__summary">{summary}</span>}
                          {hasRenderableConfig(item) && (
                            <button type="button" className="lead-action-btn" onClick={() => setPreview(item)}>
                              צפה בתלת-מימד
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <span className="lead-date">
                {new Date(o.created_at).toLocaleDateString("he-IL")}
              </span>

              <div className="lead-actions">
                <label className="orders-status-select">
                  סטטוס:
                  <select value={o.status} onChange={(e) => changeStatus(o.id, e.target.value)}>
                    {STATUS_FLOW.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </label>
                <button className="lead-action-btn danger" onClick={() => remove(o.id)}>מחק</button>
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
      {dialog}
    </div>
  );
}
