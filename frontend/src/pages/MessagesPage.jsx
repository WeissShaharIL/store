import { useCallback, useEffect, useRef, useState } from "react";
import Header from "../components/Header.jsx";
import CustomerNav from "../components/CustomerNav.jsx";
import { api } from "../api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { usePolling } from "../hooks/usePolling.js";
import { fmtMessageTime } from "../lib/dates.js";
import { Send, Mail } from "../components/Icons.jsx";

export default function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const list = await api.me.messages.list();
      setMessages(list);
      if (list.some((m) => !m.read_at)) {
        await api.me.messages.markRead();
        window.dispatchEvent(new Event("demo:unread-changed"));
      }
    } catch (e) {
      setError(e.message || "שגיאה");
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(refresh, { intervalMs: 15_000, onVisible: true, deps: [refresh] });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function handleSend(e) {
    e.preventDefault();
    const txt = body.trim();
    if (!txt) return;
    setSending(true);
    setError("");
    try {
      const msg = await api.me.messages.send(txt);
      setMessages((prev) => [...prev, msg]);
      setBody("");
    } catch (e) {
      setError(e.message || "שגיאה");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page">
      <Header title="הודעות" />
      <CustomerNav />
      <main className="page__main chat">
        {error && <div className="error">{error}</div>}
        <div className="chat__thread">
          {loading ? (
            <div className="muted">טוען…</div>
          ) : messages.length === 0 ? (
            <div className="empty-state">
              <Mail />
              <p>אין הודעות עדיין</p>
              <span className="muted">כתבו הודעה למטה כדי להתחיל שיחה עם המנהל.</span>
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`bubble ${mine ? "bubble--mine" : "bubble--theirs"}`}>
                  <div className="bubble__sender">{mine ? "אני" : "מנהל"}</div>
                  <div className="bubble__body">{m.body}</div>
                  <div className="bubble__meta">{fmtMessageTime(m.created_at)}</div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
        <form className="chat__composer" onSubmit={handleSend}>
          <textarea
            placeholder="כתבו הודעה למנהל…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <button
            className="btn btn--primary"
            type="submit"
            disabled={sending || body.trim() === ""}
            title="שלח"
          >
            <Send /> שלח
          </button>
        </form>
      </main>
    </div>
  );
}
