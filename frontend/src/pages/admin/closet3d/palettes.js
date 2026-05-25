/**
 * Closet color palettes + material tints, extracted in v1.19.0 from
 * the inline constants that used to live in each Dev*3D component.
 *
 * COLORS is a small registry — each entry pairs a Hebrew display
 * `name` with the actual hex values used by the renderer:
 *   `wood`   — the dominant surface tone (back panel, doors, shelves)
 *   `trim`   — slightly darker accent for top/bottom/sides/divider
 *   `swatch` — what the color-picker UI shows as a chip (usually
 *              equal to `wood`)
 *   `textureKey` (v1.59.0, optional) — opt into a procedural
 *              texture from `textures.js`. When set, the renderer
 *              looks up the keyed THREE.CanvasTexture and applies
 *              it as the material's `map` instead of just using
 *              the solid `wood` color. Today only `mevuka` opts
 *              in ("wood-mevuka" wood-grain pattern).
 *
 * Adding a new color: add an entry. The closet renderer will pick it
 * up automatically through the `color` prop → COLORS[color].
 *
 * MATERIAL_TINTS holds non-wood material colors that recur across
 * primitives. Keep these centralized so a future "warm metals theme"
 * is one-line to apply.
 */
/* v1.51.0 — entire palette replaced to match the supplier's actual
 * sample card (lavan → mevuka, top to bottom in the reference
 * photo). 10 entries covering solids, stone/concrete looks,
 * marbles, and wood tones. The marble + textured-stone swatches
 * are approximated with their dominant solid color for now —
 * proper image textures (UV-mapped patterns for שיש שחור / שיש לבן
 * / מבוקע / בטון / פשתן) are a v1.52.0+ backlog item.
 *
 * Note on `almond`: the ID also existed in the v1.28.0 palette but
 * with a warmer brown hex. The new v1.51.0 almond is paler, closer
 * to "eggshell almond" — any saved template using `almond` now
 * renders in the new tone. The other v1.28.0 IDs (lightgray, pine,
 * anthracite, darkwood) are removed; templates that referenced them
 * fall back to the renderer default (`almond`). */
/**
 * v1.75.0 — `DEFAULT_COLORS` is the bootstrap palette + the
 * fallback shape used by the PaletteColorsProvider until the
 * admin-managed list loads from the API. Same shape as before;
 * the live runtime palette comes from
 * usePaletteColors() in PaletteContext.jsx.
 *
 * `COLORS` is kept as a back-compat alias for legacy non-React
 * consumers and tests. Production code paths should use the hook
 * so admin edits in the new "פלטת צבעים" section apply.
 */
export const DEFAULT_COLORS = {
  white:       { name: "לבן",       wood: "#f6f4ee", trim: "#dad6cc", swatch: "#f6f4ee" },
  cream:       { name: "שמנת",      wood: "#ebe1c8", trim: "#c9bf9f", swatch: "#ebe1c8" },
  almond:      { name: "שקד",       wood: "#ddd0b6", trim: "#b8a98d", swatch: "#ddd0b6" },
  linen:       { name: "פשתן",      wood: "#bcb19a", trim: "#928871", swatch: "#bcb19a" },
  concrete:    { name: "בטון",      wood: "#9c958a", trim: "#75706a", swatch: "#9c958a" },
  basalt:      { name: "בזלת",      wood: "#4a4039", trim: "#2c2521", swatch: "#4a4039" },
  blackMarble: { name: "שיש שחור",  wood: "#18181b", trim: "#0a0a0c", swatch: "#18181b" },
  whiteMarble: { name: "שיש לבן",   wood: "#eae5dc", trim: "#bcb6ab", swatch: "#eae5dc" },
  sachlav:     { name: "סחלב",      wood: "#e6cfae", trim: "#bda881", swatch: "#e6cfae" },
  mevuka:      { name: "מבוקע",     wood: "#c4a373", trim: "#a88458", swatch: "#c4a373", textureKey: "wood-mevuka" },
};
export const COLORS = DEFAULT_COLORS;

export const MATERIAL_TINTS = {
  aluminum: "#bcc4ca",
  glass:    "#a8c5d5",
  // v1.43.0 — brightened from #e8f0ff to make the mirror read as
  // more uniformly reflective. The "apartment" env preset has warm
  // floor reflections that get picked up on the bottom of vertical
  // mirrors and can read as "non-mirror"; a brighter tint helps the
  // material come through over the env variation.
  mirror:   "#f5f9ff",
  brass:    "#c9a961",
  chrome:   "#c0c0c0",
};

/**
 * v1.84.0 — handle bar options moved to a DB-backed admin catalog
 * (mirroring the v1.75.0 palette refactor). The renderer + builder
 * + designer pull live handle data through usePaletteColors's
 * sibling hook `useHandles()` from HandlesContext. Same shape as
 * the legacy map below, plus two new fields the admin can set:
 *
 *   - `finish`    — "metallic" | "matte". The renderer translates
 *                   this into roughness + metalness via
 *                   `materialPropsForFinish()` below.
 *   - `door_kind` — "hinged" | "sliding" | "both". Filters which
 *                   closets surface the handle in their picker.
 *
 * `DEFAULT_HANDLES` is the bootstrap fallback used until the API
 * list loads (and by non-React call sites like the v1.69.0 default
 * for primitives that take a handleMaterial prop).
 *
 * `HANDLES` is kept as an alias for the few remaining call sites
 * that haven't been refactored to the hook yet; they all
 * eventually go through `materialPropsForFinish(silver.finish)`
 * so silver renders identically to the pre-v1.69 aluminum tint.
 */
export const DEFAULT_HANDLES = {
  silver: { name: "כסוף", color: "#bcc4ca", finish: "metallic", door_kind: "both" },
  white:  { name: "לבן",  color: "#f0f0f0", finish: "matte",    door_kind: "both" },
  black:  { name: "שחור", color: "#1a1a1a", finish: "matte",    door_kind: "both" },
};

/* Material parameters per finish. Two presets cover the supplier's
 * stock: polished metal (silver) and painted/coated metal
 * (white / black / colored). Admin picks the finish; the renderer
 * picks the roughness + metalness here. */
export function materialPropsForFinish(finish) {
  if (finish === "metallic") {
    return { roughness: 0.35, metalness: 0.9 };
  }
  // matte default — also covers any unknown finish string so a
  // future admin-added finish that the renderer doesn't recognize
  // still draws as a sensible matte bar.
  return { roughness: 0.55, metalness: 0.15 };
}

/* Resolve a handle catalog entry to the full `{color, roughness,
 * metalness}` object the primitives expect on their
 * `handleMaterial` prop. Pure function — handed live catalog
 * entries (from useHandles) or DEFAULT_HANDLES fallback entries. */
export function handleMaterialFor(entry) {
  if (!entry) entry = DEFAULT_HANDLES.silver;
  return {
    color: entry.color,
    ...materialPropsForFinish(entry.finish),
  };
}

/* v1.69.0–v1.83.x: HANDLES was a hardcoded map with roughness +
 * metalness baked in. Now derived from DEFAULT_HANDLES via
 * materialPropsForFinish so old call sites that read
 * `HANDLES[key].roughness` etc. keep working without changes.
 * Prefer `handleMaterialFor(useHandles().handles[key])` in new
 * code. */
export const HANDLES = Object.fromEntries(
  Object.entries(DEFAULT_HANDLES).map(([key, entry]) => [
    key,
    { name: entry.name, color: entry.color, ...materialPropsForFinish(entry.finish) },
  ]),
);

export const DEFAULT_HANDLE = "silver";

/**
 * v1.74.0 — back-compat alias map for `config.color`. Older templates
 * (pre v1.51.0 palette rename) stored colors under names that no
 * longer exist in COLORS — for example, "lightgray" was the
 * gray-tone option before the catalog renamed it to "concrete". The
 * renderer used to silently fall back to almond for any unknown
 * key, so those templates rendered as a warm beige cabinet instead
 * of the gray the admin originally picked.
 *
 * resolveColorKey() runs every `config.color` lookup through this
 * map first so legacy keys land on the right modern entry. No DB
 * migration needed — old configs keep their original value, the
 * renderer just translates it on load.
 *
 * Extend this map when you find more stale keys in production
 * (the `closet_templates.config_json` field is the source of
 * truth — see ops note in v1.74.0.md for the inspection query).
 */
const COLOR_ALIASES = {
  lightgray: "concrete",
};

export function resolveColorKey(key, colors = DEFAULT_COLORS) {
  if (!key) return null;
  if (colors[key]) return key;
  if (COLOR_ALIASES[key]) return COLOR_ALIASES[key];
  return null;
}

// v1.83.1 — removed: DOOR_KINDS = ["wood","glass","mirror"]. The
// constant was a "hint" export that no consumer ever imported; the
// three values are inlined in the renderer (DoorMaterial), the
// admin builder, and the customer designer's step-4 picker. If we
// ever centralize this list, prefer a typed union over a magic
// array.
