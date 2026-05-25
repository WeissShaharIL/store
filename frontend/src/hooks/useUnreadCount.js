import { useCallback, useState } from "react";
import { api } from "../api.js";
import { usePolling } from "./usePolling.js";

export function useUnreadCount({ isAdmin = false, intervalMs = 30_000 } = {}) {
  const [unread, setUnread] = useState(0);

  const tick = useCallback(async () => {
    if (isAdmin) {
      const threads = await api.admin.messages.threads();
      setUnread(threads.reduce((s, t) => s + (t.unread_count || 0), 0));
    } else {
      const r = await api.me.messages.unreadCount();
      setUnread(r.count || 0);
    }
  }, [isAdmin]);

  usePolling(tick, {
    intervalMs,
    onVisible: true,
    listenEvent: "demo:unread-changed",
    deps: [tick],
  });

  return unread;
}
