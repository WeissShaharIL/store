export const SNAP_POSITIONS = Array.from(
  { length: 10 },
  (_, i) => 0.05 + i * 0.1,
);

export const SLOT_EPS = 0.001;

// external_drawer sits below the closet — seed it at the lowest slot.
export const DEFAULT_SLOT = { shelf: 0.55, rod: 0.85, drawer: 0.15, external_drawer: 0.05 };

// An external drawer always renders as a front drawer at the BOTTOM of the
// cabin in 3D (ClosetDesigner folds it into the door's drawerStack), so in the
// stage-2 planner it must live at the lowest slot regardless of where the user
// drops it. Resolve it from a placed item's type ("external_drawer", or a
// component chip "c:<id>" whose item_type is external_drawer).
export function isExternalDrawerType(type, paletteComponents) {
  if (type === "external_drawer") return true;
  const cid =
    typeof type === "string" && type.startsWith("c:") ? parseInt(type.slice(2), 10) : null;
  if (cid == null) return false;
  return (paletteComponents ?? []).find((c) => c.id === cid)?.item_type === "external_drawer";
}

export function slotIndexFor(yNorm) {
  let bestIdx = 0;
  let bestDist = Math.abs(yNorm - SNAP_POSITIONS[0]);
  for (let i = 1; i < SNAP_POSITIONS.length; i++) {
    const d = Math.abs(yNorm - SNAP_POSITIONS[i]);
    if (d < bestDist) {
      bestIdx = i;
      bestDist = d;
    }
  }
  return bestIdx;
}

export function snapToSlot(yNorm) {
  return SNAP_POSITIONS[slotIndexFor(yNorm)];
}

export function findFreeSlotIndex(items, type) {
  const used = new Set();
  for (const it of items) {
    for (let i = 0; i < SNAP_POSITIONS.length; i++) {
      if (Math.abs(it.y - SNAP_POSITIONS[i]) < SLOT_EPS) {
        used.add(i);
        break;
      }
    }
  }
  if (used.size >= SNAP_POSITIONS.length) return null;

  const preferred = slotIndexFor(DEFAULT_SLOT[type] ?? 0.55);
  for (let d = 0; d < SNAP_POSITIONS.length; d++) {
    const candidates = d === 0 ? [preferred] : [preferred + d, preferred - d];
    for (const idx of candidates) {
      if (idx >= 0 && idx < SNAP_POSITIONS.length && !used.has(idx)) {
        return idx;
      }
    }
  }
  return null;
}
