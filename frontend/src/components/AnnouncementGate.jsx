import { useCallback, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { usePolling } from "../hooks/usePolling.js";
import { Check } from "./Icons.jsx";

export default function AnnouncementGate() {
  const { user } = useAuth();
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const check = useCallback(async () => {
    if (!user) {
      setPending(null);
      return;
    }
    const a = await api.me.pendingAnnouncement();
    setPending(a || null);
  }, [user]);

  usePolling(check, { intervalMs: 30_000, onVisible: true, deps: [check] });

  if (!user || !pending) return null;

  async function handleAccept() {
    setBusy(true);
    setError("");
    try {
      await api.me.ackAnnouncement(pending.id);
      setPending(null);
    } catch (e) {
      setError(e.message || "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="announcement-gate" role="dialog" aria-modal="true">
      <div className="announcement-gate__card">
        <h2 className="announcement-gate__title">הודעה חשובה</h2>
        <div className="announcement-gate__body">{pending.body}</div>
        {error && <div className="error">{error}</div>}
        <button
          className="btn btn--primary btn--block"
          onClick={handleAccept}
          disabled={busy}
        >
          <Check /> {busy ? "שולח…" : "אישור והמשך"}
        </button>
      </div>
    </div>
  );
}
