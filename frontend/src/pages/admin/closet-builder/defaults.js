/**
 * Initial-config seeds for the closet builder.
 *
 *   newConfig() / newDoor() — what "+ חדש" produces (a sensible
 *                              2-door starter cabinet).
 *   randomConfig() / randomDoor() — what "הפתע אותי" produces
 *                                   (v1.43.0 random generator).
 *
 * Extracted from DevClosetBuilder.jsx in v1.46.0.
 */

import { pick, rangeInt, chance } from "./helpers.js";

/* ─────────── Defaults / new-config seed ─────────── */

export function defaultMaterialChoices() {
  // v1.34.0 — door material is a pure visual choice; no inline
  // prices. If priced upgrades come back they'll live elsewhere.
  return [
    { id: "wood",   label: "עץ" },
    { id: "glass",  label: "זכוכית" },
    { id: "mirror", label: "מראה" },
  ];
}

/* v1.56.0 — newDoor now takes the closet-level kind so every door
 * in a closet matches. Per-door kind picker is gone from the
 * builder; admin sets the kind once at the closet level. */
export function newDoor(index, kind = "hinged") {
  return {
    id: `door-${Date.now()}-${index}`,
    kind,
    track: index % 2 === 0 ? "back" : "front",
    label: `דלת ${index + 1}`,
    defaultMaterial: "wood",
    materialChoices: defaultMaterialChoices(),
    hingeSide: index % 2 === 0 ? "left" : "right",
    compartment: {
      defaultVariant: "default",
      variants: [
        {
          id: "default",
          label: "ברירת מחדל",
          items: [
            { type: "shelf", y: 0.75 },
            { type: "shelf", y: 0.5  },
            { type: "rod",   y: 0.85 },
          ],
        },
      ],
    },
  };
}

/* v1.56.0 — fill in fields that older saved templates don't have:
 *   - `kind` derived from `doors[0].kind` (or "hinged" if empty).
 *   - `constraints` populated with permissive defaults that mirror
 *     the renderer's old hardcoded slider ranges so the designer
 *     keeps working without admin re-tuning.
 *
 * Returns a new config; never mutates the input. Idempotent —
 * configs already at the v1.56.0 shape pass through unchanged. */
export function migrateConfig(config) {
  if (!config) return config;
  const out = { ...config };
  if (!out.kind) {
    out.kind = out.doors?.[0]?.kind ?? "hinged";
  }
  if (!out.constraints) {
    const nDoors = Math.max(1, out.doors?.length ?? 1);
    const cw = out.dimensions?.compartmentWidth ?? 80;
    const totalW = cw * nDoors;
    out.constraints = {
      height: { min: 100, max: 300, step: 5, default: out.dimensions?.H ?? 240 },
      width:  { min: 40 * nDoors, max: 150 * nDoors, step: 5, default: totalW },
      depth:  { min: 30, max: 100, step: 5, default: out.dimensions?.D ?? 56 },
    };
  }
  // v1.60.0 — older templates were authored when the renderer
  // always drew vertical dividers; default them to true so their
  // existing rendered look is preserved. New templates set the
  // field explicitly to false in newConfig().
  if (out.hasInternalDivider === undefined) {
    out.hasInternalDivider = true;
  }
  // v1.62.0 — default closed (customer can't toggle) for older
  // templates, since they pre-date the per-template permission
  // concept. Admin can opt in per-template in the builder.
  if (out.allowDividerToggle === undefined) {
    out.allowDividerToggle = false;
  }
  // v1.62.0 — old templates inherited T=5 (cm) from the v1.34.0
  // default. Real furniture boards are 1.5-2.5 cm; cap to 2 cm so
  // legacy templates stop looking like brick walls. Admin can
  // re-tune up to 3 cm in the builder if they really need thicker.
  if (out.dimensions && out.dimensions.T > 3) {
    out.dimensions = { ...out.dimensions, T: 2 };
  }
  // v1.69.0 — handle option. Defaults to "silver", which renders as
  // the same aluminum tint we've been using since v1.28.0, so
  // migrated templates look identical to the historical render.
  if (!out.handleColor) {
    out.handleColor = "silver";
  }
  return out;
}

/* v1.56.0 — default per-template constraints. Mirrors the user's
 * v1.56.0 direction: depth has two discrete values (41 / 56 cm,
 * default 56); height ranges 180–270 in steps of 10 cm (default
 * 240); width ranges 80–100 cm in steps of 10 (default 80). These
 * are the 2-door defaults; admin re-tunes per template (the user
 * said 4-door templates want width 140–200, default 160, etc.). */
export function defaultConstraints() {
  return {
    height: { min: 180, max: 270, step: 10, default: 240 },
    width:  { min: 80,  max: 100, step: 10, default: 80  },
    depth:  { min: 41,  max: 56,  step: 15, default: 56  },
  };
}

export function newConfig() {
  // 2-door hinged starter cabinet using the v1.56.0 constraint
  // defaults — dimensions track the constraint defaults so a fresh
  // template "just works" in the designer without any further
  // admin tuning.
  const constraints = defaultConstraints();
  const kind = "hinged";
  const nDoors = 2;
  return {
    name: "מודל חדש",
    basePrice: 1000,
    kind,
    constraints,
    // v1.34.0 — dimensions are stored in centimeters.
    // v1.62.0 — T (panel thickness) default dropped from 5 to 2 cm
    // to match real furniture board thickness (1.5-2.5 cm
    // typical). Old default of 5 cm rendered as chunky CG bricks.
    dimensions: {
      compartmentWidth: Math.round(constraints.width.default / nDoors),
      H: constraints.height.default,
      D: constraints.depth.default,
      T: 2,
    },
    color: "white",
    hasTrackRails: false,
    // v1.60.0 — new templates default to an open interior (no
    // vertical dividers between compartments). Admin can opt in
    // via the AppearanceEditor.
    hasInternalDivider: false,
    // v1.62.0 — customer doesn't see a divider toggle in the
    // designer unless admin explicitly permits it (rare; most
    // product lines are fixed-spec). Admin opts in via the
    // AppearanceEditor's "אפשר ללקוח לשנות מחיצה" toggle.
    allowDividerToggle: false,
    // v1.69.0 — silver (chrome-tone) is the default handle option.
    // Admin can switch to white / black per template, customer can
    // override per-door in step 3 of the designer.
    handleColor: "silver",
    doors: Array.from({ length: nDoors }, (_, i) => newDoor(i, kind)),
    addOns: [],
  };
}

/* ─────────── "הפתע אותי" random generator (v1.43.0) ─────────── */

/* v1.56.0 — randomDoor takes the closet-level kind so all doors
 * in a random closet share a kind (matches the v1.56.0 "axis or
 * sliding, not mixed" rule). */
export function randomDoor(index, kind) {
  const drawerStack = pick([0, 0, 0, 0, 1, 2]); // weighted toward 0
  const drawerSplit = drawerStack > 0 && chance(0.3);
  // 2-4 items at sorted random y positions in the door's compartment.
  // When drawerStack > 0 the variant drawer type is omitted (would
  // clash with the external stack below).
  const itemTypes = drawerStack > 0 ? ["shelf", "rod"] : ["shelf", "rod", "drawer"];
  const count = rangeInt(2, 4);
  const ys = Array.from({ length: count }, () => 0.15 + Math.random() * 0.75).sort();
  return {
    id: `door-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    kind,
    track: index % 2 === 0 ? "back" : "front",
    label: `דלת ${index + 1}`,
    defaultMaterial: pick(["wood", "wood", "wood", "glass", "mirror"]),
    materialChoices: defaultMaterialChoices(),
    hingeSide: index % 2 === 0 ? "left" : "right",
    drawerStack,
    drawerSplit,
    compartment: {
      defaultVariant: "default",
      variants: [
        {
          id: "default",
          label: "ברירת מחדל",
          items: ys.map((y) => ({ type: pick(itemTypes), y })),
        },
      ],
    },
  };
}

export function randomConfig() {
  const colorOptions = ["white", "cream", "almond", "linen", "concrete", "basalt", "blackMarble", "whiteMarble", "sachlav", "mevuka"];
  const kind = chance(0.7) ? "hinged" : "sliding";
  const doorCount = rangeInt(1, 4);
  // v1.56.0 — derive a per-template constraint set roughly matching
  // the door count (wider closets need wider widths). Defaults
  // chosen so the resulting cabinet sits in the middle of its
  // constraint range.
  const widthPerDoor = rangeInt(7, 10) * 10; // 70-100 cm per door
  const totalWidth = widthPerDoor * doorCount;
  const widthSpread = 40; // ±20 cm around default
  const heightDefault = rangeInt(20, 27) * 10; // 200-270 cm
  const depthDefault = pick([41, 56]);
  const constraints = {
    height: { min: 180, max: 270, step: 10, default: heightDefault },
    width: {
      min: Math.max(40 * doorCount, totalWidth - widthSpread),
      max: totalWidth + widthSpread,
      step: 10,
      default: totalWidth,
    },
    depth: { min: 41, max: 56, step: 15, default: depthDefault },
  };
  const doors = Array.from({ length: doorCount }, (_, i) => randomDoor(i, kind));
  return {
    name: `ארון אקראי ${rangeInt(100, 999)}`,
    basePrice: rangeInt(8, 30) * 100,
    kind,
    constraints,
    dimensions: {
      compartmentWidth: widthPerDoor,
      H: heightDefault,
      D: depthDefault,
      T: 5,
    },
    color: pick(colorOptions),
    hasTrackRails: kind === "sliding",
    doors,
    addOns: chance(0.5)
      ? [
          { id: "shelfProfile", label: "פרופיל אלומיניום למדפים", price: 200, effect: "aluminumOnShelves" },
          { id: "sideProfile",  label: "פרופיל אלומיניום לצדדים", price: 150, effect: "aluminumPerimeterOnSides" },
        ]
      : [],
  };
}
