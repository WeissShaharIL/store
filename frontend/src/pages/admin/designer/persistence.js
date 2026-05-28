const STORAGE_PREFIX = "forma_designer_state_";
const SCHEMA_VERSION = 1;

export function loadDesignerState(itemId) {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + itemId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || parsed.v !== SCHEMA_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDesignerState(itemId, state) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      STORAGE_PREFIX + itemId,
      JSON.stringify({ v: SCHEMA_VERSION, ...state, savedAt: new Date().toISOString() }),
    );
  } catch { /* quota exceeded — silent */ }
}

export function clearDesignerState(itemId) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try { window.localStorage.removeItem(STORAGE_PREFIX + itemId); } catch { /* ignore */ }
}
