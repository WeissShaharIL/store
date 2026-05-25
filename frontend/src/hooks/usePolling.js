import { useEffect } from "react";

export function usePolling(
  callback,
  { intervalMs = 30_000, onVisible = true, listenEvent = null, deps = [] } = {}
) {
  useEffect(() => {
    let cancelled = false;
    async function tick() {
      if (cancelled) return;
      try {
        await callback();
      } catch {
        // transient failures — let the next tick retry
      }
    }
    tick();
    const id = setInterval(tick, intervalMs);
    const onVis = onVisible
      ? () => document.visibilityState === "visible" && tick()
      : null;
    if (onVis) document.addEventListener("visibilitychange", onVis);
    if (listenEvent) window.addEventListener(listenEvent, tick);
    return () => {
      cancelled = true;
      clearInterval(id);
      if (onVis) document.removeEventListener("visibilitychange", onVis);
      if (listenEvent) window.removeEventListener(listenEvent, tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
