import { useEffect, useState } from "react";
import Header from "../components/Header.jsx";
import CustomerNav from "../components/CustomerNav.jsx";
import { api } from "../api.js";
import { formatILS } from "../lib/money.js";
import { fmtDate } from "../lib/dates.js";
import { FileText, ShoppingCart } from "../components/Icons.jsx";

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    api.me.orders.list()
      .then(setOrders)
      .catch((e) => setError(e.message || "שגיאה"))
      .finally(() => setLoading(false));
  }, []);

  async function downloadPdf(orderId) {
    setDownloadingId(orderId);
    setError("");
    try {
      await api.downloadFile(`/api/me/orders/${orderId}/pdf`, `order-${orderId}.pdf`);
    } catch (e) {
      setError(e.message || "שגיאה");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="page">
      <Header title="ההזמנות שלי" />
      <CustomerNav />
      <main className="page__main">
        <div className="page-toolbar">
          <div className="page-toolbar__title">
            <h2>ההזמנות שלי</h2>
            <span className="muted">{orders.length}</span>
          </div>
        </div>
        {loading && <div className="muted">טוען…</div>}
        {error && <div className="error">{error}</div>}
        {!loading && !error && orders.length === 0 && (
          <div className="empty-state">
            <ShoppingCart />
            <p>טרם נשלחו הזמנות</p>
            <span className="muted">צרו את ההזמנה הראשונה מתוך הקטלוג.</span>
          </div>
        )}
        <div className="orders-list">
          {orders.map((o) => {
            const open = expanded === o.id;
            return (
              <div key={o.id} className={"order-card" + (open ? " order-card--open" : "")}>
                <button
                  className="order-card__head"
                  onClick={() => setExpanded(open ? null : o.id)}
                >
                  <div className="order-card__head-main">
                    <div className="order-card__date">{fmtDate(o.created_at)}</div>
                    <div className="muted">{o.lines.length} פריטים</div>
                  </div>
                  <div className="order-card__head-status">
                    {o.delivered_at ? (
                      <span className="pill pill--ok">סופק</span>
                    ) : (
                      <span className="pill">פתוח</span>
                    )}
                    <span className="order-card__total">{formatILS(o.total_amount)}</span>
                  </div>
                </button>
                {open && (
                  <div className="order-card__body">
                    <div className="order-card__actions">
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => downloadPdf(o.id)}
                        disabled={downloadingId === o.id}
                      >
                        <FileText />{" "}
                        {downloadingId === o.id ? "מוריד…" : "הורד PDF"}
                      </button>
                    </div>
                    {o.notes && (
                      <div className="order-card__notes">
                        <strong>הערות:</strong> {o.notes}
                      </div>
                    )}
                    <div className="table-scroll">
                      <table className="order-lines">
                        <thead>
                          <tr>
                            <th>קוד</th>
                            <th>שם</th>
                            <th>כמות</th>
                            <th>מחיר יח'</th>
                            <th>סך</th>
                          </tr>
                        </thead>
                        <tbody>
                          {o.lines.map((l) => (
                            <tr key={l.id}>
                              <td data-label="קוד">{l.product_code}</td>
                              <td data-label="שם">{l.name}</td>
                              <td data-label="כמות">{l.quantity}</td>
                              <td data-label="מחיר יח'">{formatILS(l.unit_price)}</td>
                              <td data-label="סך">{formatILS(Number(l.unit_price) * l.quantity)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
