/**
 * Shared visuals for closet interior components (מדף / מוט / מגירה /
 * מגירה חיצונית). One source of truth for:
 *   - the admin "תוספות ארון" type pool (pick how a component looks)
 *   - the stage-2 planner palette chips
 * The planner's PlacedItem draws its own full-width depictions with the same
 * material colors so the chip, the pool card, and the placed item all match.
 */

// Material tones matching the 3D model (wood shelf/drawer, metal rod).
export const ITEM_WOOD = "#b99472";
export const ITEM_WOOD_EDGE = "#8a6f4e";
export const ITEM_METAL = "#9aa0a6";
export const ITEM_HANDLE = "#4a4a4f";

export const ITEM_TYPE_OPTIONS = [
  { value: "shelf", label: "מדף" },
  { value: "rod", label: "מוט תליה" },
  { value: "drawer", label: "מגירה" },
  { value: "external_drawer", label: "מגירה חיצונית" },
];

export function itemTypeLabel(type) {
  return ITEM_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? null;
}

/* Small standalone illustration of how the item looks in the closet model. */
export function ItemTypeIcon({ type, ...props }) {
  const base = { viewBox: "0 0 48 32", width: 48, height: 32, "aria-hidden": true, ...props };
  if (type === "shelf") {
    return (
      <svg {...base}>
        <rect x="4" y="14" width="40" height="5" rx="1" fill={ITEM_WOOD} />
        <rect x="4" y="17.5" width="40" height="1.5" rx="0.75" fill={ITEM_WOOD_EDGE} />
      </svg>
    );
  }
  if (type === "rod") {
    return (
      <svg {...base}>
        <rect x="4" y="8" width="3.5" height="10" rx="1" fill={ITEM_METAL} />
        <rect x="40.5" y="8" width="3.5" height="10" rx="1" fill={ITEM_METAL} />
        <rect x="6" y="11" width="36" height="3" rx="1.5" fill={ITEM_METAL} />
        <rect x="6" y="11.6" width="36" height="0.9" rx="0.45" fill="#c7ccd1" />
        {/* hanger hint */}
        <path d="M24 14.5 L24 17 M19 24 a5 6 0 0 1 10 0" stroke={ITEM_METAL} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "drawer") {
    return (
      <svg {...base}>
        <rect x="5" y="6" width="38" height="20" rx="2" fill={ITEM_WOOD} stroke={ITEM_WOOD_EDGE} strokeWidth="1.4" />
        <rect x="17" y="14.5" width="14" height="3" rx="1.5" fill={ITEM_HANDLE} />
      </svg>
    );
  }
  if (type === "external_drawer") {
    return (
      <svg {...base}>
        {/* cabinet bottom edge the drawer sits under */}
        <line x1="3" y1="8" x2="45" y2="8" stroke={ITEM_WOOD_EDGE} strokeWidth="1.4" strokeDasharray="4 3" />
        <rect x="5" y="11" width="38" height="16" rx="2" fill={ITEM_WOOD} stroke={ITEM_WOOD_EDGE} strokeWidth="1.4" />
        <rect x="17" y="17.5" width="14" height="3" rx="1.5" fill={ITEM_HANDLE} />
      </svg>
    );
  }
  // General add-on (no in-closet representation)
  return (
    <svg {...base}>
      <rect x="10" y="9" width="28" height="14" rx="3" fill="none" stroke={ITEM_METAL} strokeWidth="1.6" strokeDasharray="4 3" />
    </svg>
  );
}
