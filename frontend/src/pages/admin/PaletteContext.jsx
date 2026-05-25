import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getPublicColors } from "../../api.js";
import { DEFAULT_COLORS } from "./closet3d/palettes.js";

/*
 * v1.76.1 — moved up one directory out of `/pages/admin/closet3d/`.
 * Why: the vite manualChunks rule scoops every file in /closet3d/
 * into the heavy closet3d-shared bundle. Once this Provider lived
 * there, Rollup decided React's runtime should live with it too,
 * splitting React across two chunks. When three-bundle (which has
 * @react-three/fiber) initialized, the React internals it needs
 * weren't in scope yet → `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED`
 * on undefined → white page. Keeping this file at the admin/ level
 * leaves closet3d-shared identical to its v1.74.0 shape and lets
 * React stay in the main entry where R3F can find it.
 */

/**
 * v1.75.0 — admin-managed palette colors. The renderer
 * (ClosetFromConfig) and the builder's ColorPicker both read the
 * palette through this context instead of importing a static
 * COLORS map, so admin edits in the new "פלטת צבעים" section show
 * up everywhere without a code deploy.
 *
 * Shape returned by usePaletteColors():
 *   {
 *     colors: { [color_key]: { name, wood, trim, swatch, textureKey? } },
 *     list:   [ { id, color_key, name, wood, trim, swatch, has_texture,
 *                 texture_key, sort_order, ... } ],  // raw API rows
 *     loading: bool,
 *     error:   string | null,
 *     refresh: () => Promise<void>,
 *   }
 *
 * The `colors` object mirrors the legacy COLORS map shape so call
 * sites can swap in without other changes (`COLORS[id]` →
 * `colors[id]`). DEFAULT_COLORS is the fallback / initial value so
 * the renderer never hits a "missing palette" state during the
 * first paint.
 */
const PaletteContext = createContext(null);

function rowsToMap(rows) {
  const out = {};
  for (const r of rows) {
    out[r.color_key] = {
      name: r.name,
      wood: r.wood,
      trim: r.trim,
      swatch: r.swatch,
      // v1.99.11 — when has_texture is true, pass the admin's
      // explicit choice through; when false, leave textureKey
      // undefined so the renderer's getTextureForKey() fallback
      // returns the universal neutral grain instead of a wood
      // texture. Pre-1.99.11 the legacy default was "wood-mevuka"
      // because that was the only available texture; now there
      // are four (wood-mevuka, oak, marble, concrete) plus the
      // implicit neutral grain, so the legacy default would
      // surprise an admin who toggled has_texture without
      // picking a key. Empty texture_key + has_texture=true is
      // an admin UI bug that the PaletteRowEditing form prevents
      // (the selector always sets one or the other).
      textureKey:
        r.has_texture && r.texture_key ? r.texture_key : undefined,
    };
  }
  return out;
}

export function PaletteColorsProvider({ children }) {
  const [list, setList] = useState([]);
  const [colors, setColors] = useState(DEFAULT_COLORS);
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
      // /api/admin/palette-colors.
      const rows = await getPublicColors();
      setList(rows);
      setColors(rowsToMap(rows));
    } catch (e) {
      setError(e.message || "שגיאה");
      // Leave `colors` on whatever was loaded last (or DEFAULT_COLORS
      // for first-load failures) so the renderer keeps working.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ colors, list, loading, error, refresh }),
    [colors, list, loading, error, refresh],
  );

  return (
    <PaletteContext.Provider value={value}>
      {children}
    </PaletteContext.Provider>
  );
}

/**
 * Read the current palette. Safe to call outside a
 * PaletteColorsProvider — returns the DEFAULT_COLORS-backed
 * fallback shape so static thumbnails (3D gallery cards rendered
 * during route prefetch, etc.) keep painting.
 */
export function usePaletteColors() {
  const ctx = useContext(PaletteContext);
  if (ctx) return ctx;
  return {
    colors: DEFAULT_COLORS,
    list: [],
    loading: false,
    error: null,
    refresh: async () => {},
  };
}
