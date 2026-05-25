import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getPublicHandles } from "../../api.js";
import { DEFAULT_HANDLES, DEFAULT_HANDLE } from "./closet3d/palettes.js";

/**
 * v1.84.0 — admin-managed handle catalog. Same pattern as the
 * v1.75.0 PaletteColorsProvider, deliberately mirrored: the
 * renderer + builder + designer all read handles through
 * `useHandles()`, so admin edits in the new "ידיות" section flow
 * everywhere without a code deploy.
 *
 * The file deliberately sits in `/pages/admin/` (not in
 * `/closet3d/`) — the v1.76.1 chunk-split lesson: anything that
 * uses React hooks and is statically imported by DevelopmentTab
 * must stay out of the closet3d-shared chunk to avoid pulling
 * React's runtime in alongside three.js.
 *
 * Shape returned by useHandles():
 *   {
 *     handles: { [handle_key]: { name, color, finish, door_kind } },
 *     list:    [ { id, handle_key, name, color, finish, door_kind,
 *                  sort_order, ... } ],
 *     loading: bool,
 *     error:   string | null,
 *     refresh: () => Promise<void>,
 *   }
 *
 * The `handles` object matches the legacy DEFAULT_HANDLES shape so
 * call sites can index by key (`handles[door.handleColor]`).
 * `list` is the raw API rows preserving sort_order — the admin UI
 * iterates this directly.
 */
const HandlesContext = createContext(null);

function rowsToMap(rows) {
  const out = {};
  for (const r of rows) {
    out[r.handle_key] = {
      name: r.name,
      color: r.color,
      finish: r.finish,
      door_kind: r.door_kind,
    };
  }
  return out;
}

export function HandlesProvider({ children }) {
  const [list, setList] = useState([]);
  const [handles, setHandles] = useState(DEFAULT_HANDLES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // v1.88.1 — read from the public endpoint instead of the
      // admin one so the showroom (and any future public surface
      // that mounts a 3D scene) doesn't 401 for anonymous visitors.
      // Same response shape; admin writes still go through
      // /api/admin/handles.
      const rows = await getPublicHandles();
      setList(rows);
      setHandles(rowsToMap(rows));
    } catch (e) {
      setError(e.message || "שגיאה");
      // Leave whatever was loaded last (or DEFAULT_HANDLES on
      // first-load failures) so the renderer keeps drawing.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ handles, list, loading, error, refresh }),
    [handles, list, loading, error, refresh],
  );

  return (
    <HandlesContext.Provider value={value}>
      {children}
    </HandlesContext.Provider>
  );
}

/* Default-handles fallback as the same {list, handles} shape the
 * provider returns. Derived once at module load — pure data, no
 * runtime cost. */
const FALLBACK_LIST = Object.entries(DEFAULT_HANDLES).map(
  ([handle_key, entry], i) => ({
    id: -(i + 1),
    handle_key,
    name: entry.name,
    color: entry.color,
    finish: entry.finish,
    door_kind: entry.door_kind,
    sort_order: i,
  }),
);

/**
 * Read the current handle catalog. Safe to call outside a
 * HandlesProvider — falls back to DEFAULT_HANDLES (in both list
 * and map shapes) so static thumbnails AND unit tests for picker
 * components work without needing a Provider wrapper.
 */
export function useHandles() {
  const ctx = useContext(HandlesContext);
  if (ctx) return ctx;
  return {
    handles: DEFAULT_HANDLES,
    list: FALLBACK_LIST,
    loading: false,
    error: null,
    refresh: async () => {},
  };
}

/**
 * Filter the catalog list down to handles compatible with a given
 * door kind. "both" entries always show; "hinged" only for hinged
 * closets; "sliding" only for sliding. Helper so the picker UIs
 * don't all reimplement the same filter.
 */
export function handlesForDoorKind(list, doorKind) {
  if (!doorKind || doorKind === "both") return list;
  return list.filter((h) => h.door_kind === "both" || h.door_kind === doorKind);
}

export { DEFAULT_HANDLE };
