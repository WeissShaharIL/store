/**
 * Closet config schema — the data shape the admin builder writes and
 * the `ClosetFromConfig` renderer paints. See `ClosetFromConfig.jsx`.
 *
 * v1.22.0 redesigned this from the v1.20.0 shape. The big change:
 * doors and compartments are now 1:1. Each door in
 * `config.doors` owns its compartment inline. The cabinet's total width is derived from
 * `dimensions.compartmentWidth × doors.length` — adding a door grows
 * the closet and adds the new compartment automatically.
 *
 * Also in v1.22.0:
 *   - Color is a single string (was: list of choices + a default).
 *     "Customer can choose a color" becomes a per-property
 *     modification flag once the customer surface ships.
 *   - New item type: "drawer". Renders as a front-facing panel.
 *   - Per-model draft/ready flag (`is_ready`) — tracked at the row
 *     level in the backend, not inside this config.
 *
 * Two distinct objects flow through the system:
 *
 *   ClosetConfig — the static model (dimensions, color, what
 *                  compartments and doors look like). Created in the
 *                  admin builder. Persisted in `closet_templates`.
 *
 *   ClosetState  — runtime customer choices on top of the model
 *                  (door materials, add-on toggles, slider). Lives in
 *                  component state today; will be persisted as part
 *                  of a customer order when that surface ships.
 *
 * The renderer takes both: `<ClosetFromConfig config={...} state={...} />`.
 */

/* ─────────── ClosetConfig ─────────── */

/**
 * @typedef {Object} ClosetDimensions
 *
 * v1.34.0 — dimensions are stored as **centimeters** (integers).
 * The renderer divides by 100 when converting to world units
 * (Three.js scenes use 1 unit = 1 meter by convention).
 *
 * @property {number} H  height in cm (e.g. 400 = 4 m wardrobe)
 * @property {number} D  depth in cm (e.g. 70)
 * @property {number} T  panel thickness in cm (typically 5)
 * @property {number} compartmentWidth  width of ONE compartment, cm.
 *   Total cabinet width is `compartmentWidth × doors.length`.
 */

/**
 * @typedef {"shelf" | "rod" | "drawer"} CompartmentItemType
 *
 * @typedef {Object} CompartmentItem
 * @property {CompartmentItemType} type
 * @property {number} y
 *   Normalized 0..1 of inner closet height (0 = floor, 1 = ceiling).
 *   The renderer converts to world coordinates using ClosetDimensions.H.
 *   For drawers, this is the center of the drawer face.
 */

/**
 * @typedef {Object} CompartmentVariant
 * @property {string} id
 * @property {string} [label]  shown in the variant picker UI
 * @property {CompartmentItem[]} items
 */

/**
 * @typedef {Object} Compartment
 * @property {CompartmentVariant[]} variants
 *   At least one. With exactly one variant, no picker is shown.
 *   With multiple, the customer picks which variant (state per door).
 * @property {string} [defaultVariant]  id of the variant to use if state doesn't specify.
 *   Defaults to variants[0].id.
 * @property {string} [pickerLabel]  optional label for the picker UI when there are multiple variants.
 */

/**
 * @typedef {"wood" | "glass" | "mirror"} DoorMaterial
 *
 * @typedef {Object} DoorMaterialChoice
 * @property {DoorMaterial} id
 * @property {string} label  what shows in the picker
 *
 * v1.34.0 — `price` was removed; door material is a pure visual
 * choice. If price differentiation comes back it'll go on the
 * future "allowed modifications" / pricing system, not inline on
 * the door spec.
 *
 * @typedef {Object} DoorSpec
 * @property {string} id          unique within this closet (used as state key)
 * @property {"hinged" | "sliding"} kind
 * @property {string} label       shown above the material picker
 * @property {DoorMaterialChoice[]} materialChoices
 * @property {DoorMaterial} [defaultMaterial]  defaults to "wood"
 * @property {"front" | "back"} [track]
 *   For sliding doors only — which of the two parallel tracks this
 *   door sits on. Allows overlapping doors to avoid z-fighting.
 *   When omitted, the renderer alternates back/front for even/odd
 *   indices (so two sliding doors out of the box overlap cleanly).
 * @property {"left" | "right"} [hingeSide]
 *   For hinged doors only — which edge the hinges are on (i.e. which
 *   way the door swings).
 * @property {Compartment} compartment
 *   The compartment behind this door. v1.22.0+ each door carries
 *   its own; the cabinet has as many compartments as doors.
 * @property {0 | 1 | 2} [drawerStack]
 *   Number of drawer ROWS below the door (door shortening +
 *   bottom drawer stack). Default 0.
 *   v1.31.0 changed the semantics so each row is a FIXED fraction
 *   of the inner cabinet height (`DRAWER_ROW_FRACTION` ≈ 15%) —
 *   total door shortening = `drawerStack × DRAWER_ROW_FRACTION`.
 *     0 — door spans full inner cabinet height.
 *     1 — door shortened by ~15%; 1 drawer row fills the bottom.
 *     2 — door shortened by ~30%; 2 stacked drawer rows fill the
 *         bottom (identical to v1.29.0/v1.30.0 behavior).
 *   When > 0 the door's compartment is squeezed into the door's
 *   remaining space — variant item `y=0..1` stays relative to the
 *   door's compartment, so existing shelves/rods proportionally
 *   compress up.
 * @property {boolean} [drawerSplit]
 *   When true (and `drawerStack > 0`), each drawer row is split
 *   in half horizontally by a thin vertical divider — two drawer
 *   faces per row instead of one. So `drawerStack=2 + drawerSplit`
 *   = 2×2 grid of 4 drawers. Default false (v1.31.0).
 */

/**
 * @typedef {"aluminumOnShelves" | "aluminumPerimeterOnSides"} AddOnEffect
 *
 * @typedef {Object} AddOn
 * @property {string} id
 * @property {string} label
 * @property {number} price
 * @property {AddOnEffect} effect
 *   What this toggle does visually. The renderer knows what each
 *   effect string means — adding a new effect value requires
 *   renderer changes too.
 */

/**
 * @typedef {"hinged" | "sliding"} ClosetKind
 *
 * @typedef {Object} DimensionConstraint
 *   v1.56.0 — admin-configurable per-template constraint for one
 *   dimension (height, width, depth). Drives the designer's slider
 *   min/max/step/default. Width is the TOTAL cabinet width
 *   (compartmentWidth × doors.length), not per-compartment.
 * @property {number} min   lowest allowed value (cm)
 * @property {number} max   highest allowed value (cm)
 * @property {number} step  slider granularity (cm). Pick the
 *                          step so min + N*step lands on the
 *                          discrete values you want (e.g. depth
 *                          41 + step 15 = 56 for a 2-option
 *                          41/56 product line).
 * @property {number} default  initial value (cm). Should be in
 *                             [min, max] and land on a step.
 *
 * @typedef {Object} ClosetConstraints
 * @property {DimensionConstraint} height
 * @property {DimensionConstraint} width    total cabinet width
 * @property {DimensionConstraint} depth
 *
 * @typedef {Object} ClosetConfig
 * @property {string} name
 * @property {number} basePrice
 * @property {ClosetDimensions} dimensions
 * @property {ClosetKind} [kind]
 *   v1.56.0 — closet-level door type. A closet can only have
 *   sliding-only doors or hinged-only doors; mixed isn't a real
 *   product. All `doors[].kind` should match this. Optional for
 *   backward compat — older templates are derived from
 *   `doors[0].kind` on read.
 * @property {ClosetConstraints} [constraints]
 *   v1.56.0 — admin-configurable bounds for the designer's
 *   dimension sliders. Optional for backward compat — designer
 *   falls back to permissive built-in ranges when missing.
 * @property {string} color
 *   ID into the COLORS map (palettes.js). v1.22.0 collapsed the
 *   previous `colorChoices: string[]` + `defaultColor: string` to a
 *   single color. The notion of "customer may pick from these
 *   alternatives" becomes a modification flag in a later release.
 * @property {boolean} [hasTrackRails]  show top/bottom sliding rails. default false
 * @property {boolean} [hasInternalDivider]
 *   v1.60.0 — when true, render vertical dividers between adjacent
 *   compartments (the v1.22.0 behavior). When false, the cabinet is
 *   one open box behind multiple doors — matches real 2-door
 *   wardrobes that don't physically partition the interior.
 *
 *   v1.62.0 — when no divider, the renderer ALSO collapses
 *   per-compartment items into a single full-cabinet-width space:
 *   only compartment 0's shelves / rods / drawers paint, each
 *   sized to the full inner cabinet width. Compartment 1+ items
 *   are skipped (they'd render as floating half-width planks with
 *   a gap where the divider would be).
 *
 *   Default behavior when missing depends on context:
 *     - Older saved templates that pre-date this field are
 *       migrated to `true` (preserves their existing rendered
 *       look — they were authored expecting dividers).
 *     - New templates created by `newConfig()` set this to
 *       `false` per the v1.60.0 product spec.
 *   Admin toggles via the AppearanceEditor.
 *
 * @property {boolean} [allowDividerToggle]
 *   v1.62.0 — when true, the customer-side designer shows a
 *   "מחיצה פנימית" toggle so the customer can flip the divider
 *   on or off. Admin enables this in the builder when the
 *   product line genuinely supports both configurations. When
 *   false (the default for new templates), the customer just
 *   sees the closet in whatever `hasInternalDivider` state
 *   admin saved.
 * @property {DoorSpec[]} doors
 *   At least one. Each door owns its compartment. Cabinet width is
 *   derived from `doors.length`.
 * @property {AddOn[]} [addOns]
 */

/* ─────────── ClosetState ─────────── */

/**
 * @typedef {Object} ClosetState
 * @property {Record<string, string>} [compartmentVariants]
 *   Maps DoorSpec.id → active variant id within that door's
 *   compartment. Missing entries fall back to the compartment's
 *   defaultVariant.
 * @property {Record<string, DoorMaterial>} [doorMaterials]
 *   Maps DoorSpec.id → material id. Missing entries default to
 *   the spec's `defaultMaterial`.
 * @property {Record<string, boolean>} [addOns]
 *   Maps AddOn.id → on/off. Missing = off.
 * @property {number} [doorSlide]
 *   -1..+1, sliding doors only. -1 = first door exposed (rightmost
 *   compartment visible), +1 = last door exposed (leftmost
 *   compartment visible). Default 0. With more than 2 doors the
 *   simple bidirectional metaphor breaks down; we keep it for the
 *   2-door case and treat 3+ doors as static for now (this matters
 *   only for the visualization slider, not for pricing).
 * @property {boolean} [hideDoors]
 *   Renderer-only flag — hide ALL doors so the interior is visible
 *   without dragging a slider.
 * @property {string[]} [hideDoorIds]
 *   Renderer-only flag (v1.23.0) — hide a SPECIFIC subset of doors
 *   by id. Used by the admin builder so each door can be opened
 *   individually for editing. A door is hidden if either
 *   `hideDoors === true` OR `hideDoorIds` includes its id.
 * @property {string[]} [openDoorIds]
 *   Renderer-only flag (v1.25.0) — render specific doors in their
 *   OPEN position (still visible, just shifted/swung). Sliding
 *   doors slide outward past the closet edge; hinged doors swing
 *   to a fixed ~80° angle. Doors not in this list render closed.
 *   When a door is in both openDoorIds and hideDoorIds, hide wins
 *   (an invisible door can't be "open" in any meaningful sense).
 * @property {string[]} [openDrawerIds]
 *   Renderer-only flag (v1.35.0) — render specific external
 *   drawer faces (the ones below shortened doors) shifted
 *   forward by ~30 cm so they read as pulled-out. Drawer IDs are
 *   stable strings `stack-<doorId>-<row>-<col>` produced by the
 *   renderer; the click-handler consumer doesn't need to know
 *   the format, just pass through what `onSelectDrawer` gives.
 * @property {number} [hingedOpenAngle]
 *   Radians, hinged doors only. Angle to swing open by. Default 0.
 */

/* ─────────── Helpers exported for consumers ─────────── */

/**
 * Total width of the cabinet, derived from per-compartment width
 * and door count. Doors are 1:1 with compartments in v1.22.0+.
 *
 * @param {ClosetConfig} config
 * @returns {number}
 */
export function totalWidth(config) {
  const cw = config.dimensions.compartmentWidth;
  const n = Math.max(1, config.doors.length);
  return cw * n;
}

/**
 * Walk the config + state and produce a flat list of selected
 * pricing add-ons. Used by the wrapper component for the
 * line-by-line price breakdown.
 *
 * @param {ClosetConfig} config
 * @param {ClosetState} state
 * @returns {{label: string, price: number}[]}
 */
export function selectedExtras(config, state) {
  const items = [];
  // v1.34.0 — door material is a pure visual choice, no upcharge.
  // Only add-on toggles contribute extras to the price breakdown.
  for (const addOn of config.addOns ?? []) {
    if (state.addOns?.[addOn.id]) {
      items.push({ label: addOn.label, price: addOn.price });
    }
  }
  return items;
}

/**
 * Compute the final price = base + sum(selected extras).
 *
 * @param {ClosetConfig} config
 * @param {ClosetState} state
 * @returns {number}
 */
export function totalPrice(config, state) {
  const extras = selectedExtras(config, state);
  return config.basePrice + extras.reduce((s, e) => s + e.price, 0);
}

/**
 * Resolve a compartment's active variant given the current state.
 *
 * @param {Compartment} compartment
 * @param {string | undefined} variantId
 * @returns {CompartmentVariant}
 */
export function resolveVariant(compartment, variantId) {
  const wanted = variantId ?? compartment.defaultVariant;
  if (wanted) {
    const found = compartment.variants.find((v) => v.id === wanted);
    if (found) return found;
  }
  return compartment.variants[0];
}
