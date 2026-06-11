import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SNAP_POSITIONS,
  SLOT_EPS,
  snapToSlot,
  findFreeSlotIndex,
  isExternalDrawerType,
} from "./interior-plan/slots.js";
import PlacedItem from "./interior-plan/PlacedItem.jsx";
import { ItemTypeIcon } from "./interior-plan/itemVisuals.jsx";
import {
  DimensionLineV,
  DimensionLineH,
} from "./interior-plan/DimensionLines.jsx";

// Legacy items placed before the component-based palette carry base types
// directly; they render as the matching model depiction.
const LEGACY = {
  shelf:  { color: "#a98865", label: "מדף",      type: "shelf" },
  rod:    { color: "#9aa0a6", label: "מוט תליה", type: "rod" },
  drawer: { color: "#6f7787", label: "מגירה",    type: "drawer" },
};

function resolveMeta(type, paletteComponents) {
  if (LEGACY[type]) return LEGACY[type];
  const compId = type?.startsWith("c:") ? parseInt(type.slice(2)) : null;
  if (compId) {
    const comp = paletteComponents?.find(c => c.id === compId);
    if (comp) return { color: comp.color || "#a98865", label: comp.name, type: comp.item_type ?? null };
  }
  return { color: "#888", label: type || "?", type: null };
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(max-width: 900px)").matches ?? false;
  });
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 900px)");
    const onChange = (e) => setIsMobile(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);
  return isMobile;
}

export default function ClosetInteriorPlan({ cfg, items, onChange, paletteComponents = null }) {
  const doors = cfg.doors ?? [];
  const nDoors = Math.max(1, doors.length);
  const hasDivider = !!cfg.hasInternalDivider;
  // Per-unit divider model: a "cabin" is a maximal run of adjacent doors with
  // no דופן between them. The planner's columns are CABINS (matching the 3D
  // renderer), so a merged unit shows one wide column keyed off its first door.
  const dividerBetween = (k) => doors[k + 1]?.divider ?? hasDivider;
  const cabins = useMemo(() => {
    const out = [];
    let i = 0;
    while (i < nDoors) {
      let size = 1;
      while (i + size <= nDoors - 1 && !dividerBetween(i + size - 1)) size++;
      out.push({ doorId: doors[i]?.id, startDoor: i, size });
      i += size;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doors, nDoors, hasDivider]);
  const compartmentCount = cabins.length;

  const widthCm = (cfg.dimensions.compartmentWidth ?? 80) * nDoors;
  const heightCm = cfg.dimensions.H ?? 240;
  const T = cfg.dimensions.T ?? 2;

  const isMobile = useIsMobile();
  const VIEW_HEIGHT = isMobile ? 720 : 520;
  const VIEW_WIDTH = isMobile ? 480 : 760;
  const VIEW_TOP_PAD = isMobile ? 56 : 36;
  const VIEW_BOTTOM_PAD = 44;
  const LEFT_GUTTER = 40;
  const RIGHT_PAD = 8;
  const drawableH = VIEW_HEIGHT - VIEW_TOP_PAD - VIEW_BOTTOM_PAD;
  const drawableW = VIEW_WIDTH - LEFT_GUTTER - RIGHT_PAD;
  // Scale preserving the closet's real aspect ratio so narrow closets
  // look narrow and wide ones look wide. The smaller of the two scale
  // factors wins, then excess space is split evenly as padding.
  const scaleH = drawableH / heightCm;
  const scaleW = drawableW / widthCm;
  const scale = Math.min(scaleH, scaleW);
  const CABINET_WIDTH_PX = widthCm * scale;
  const CABINET_HEIGHT_PX = heightCm * scale;
  const cmPerPx = 1 / scale;

  const verticalSlack = drawableH - CABINET_HEIGHT_PX;
  const horizontalSlack = drawableW - CABINET_WIDTH_PX;
  const bodyLeftPx = LEFT_GUTTER + horizontalSlack / 2;
  const bodyRightPx = bodyLeftPx + CABINET_WIDTH_PX;
  const bodyTopPx = VIEW_TOP_PAD + verticalSlack / 2;
  const bodyBottomPx = bodyTopPx + CABINET_HEIGHT_PX;
  const wallPx = T / cmPerPx;
  const interiorLeftPx = bodyLeftPx + wallPx;
  const interiorRightPx = bodyRightPx - wallPx;
  const interiorTopPx = bodyTopPx + wallPx;
  const interiorBottomPx = bodyBottomPx - wallPx;
  const interiorWidthPx = interiorRightPx - interiorLeftPx;
  const doorWidthPx = interiorWidthPx / nDoors;
  const cabinLeftPx = (c) => interiorLeftPx + c.startDoor * doorWidthPx;
  const cabinWidthPx = (c) => c.size * doorWidthPx;
  const cabinCenterPx = (c) => cabinLeftPx(c) + cabinWidthPx(c) / 2;

  const yToPx = useCallback(
    (yNorm) => interiorBottomPx - yNorm * (interiorBottomPx - interiorTopPx),
    [interiorBottomPx, interiorTopPx],
  );
  const pxToY = useCallback(
    (px) => {
      const clamped = Math.max(interiorTopPx, Math.min(interiorBottomPx, px));
      return (interiorBottomPx - clamped) / (interiorBottomPx - interiorTopPx);
    },
    [interiorBottomPx, interiorTopPx],
  );

  // Boundaries BETWEEN cabins — these are the real internal walls (דופן).
  const doorBoundariesPx = useMemo(() => {
    const dwp = interiorWidthPx / nDoors;
    return cabins.slice(1).map((c) => interiorLeftPx + c.startDoor * dwp);
  }, [interiorLeftPx, interiorWidthPx, nDoors, cabins]);

  const compartmentCentersPx = useMemo(() => {
    const dwp = interiorWidthPx / nDoors;
    return cabins.map((c) => interiorLeftPx + (c.startDoor + c.size / 2) * dwp);
  }, [interiorLeftPx, interiorWidthPx, nDoors, cabins]);

  const interiorHeightCm = Math.max(1, heightCm - 2 * T);

  const svgRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragPreview, setDragPreview] = useState(null);
  const dragPreviewRef = useRef(null);
  const dragStartPos = useRef(null);

  const allItemsRef = useRef(items);
  useEffect(() => { allItemsRef.current = items; });
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });
  const paletteRef = useRef(paletteComponents);
  useEffect(() => { paletteRef.current = paletteComponents; });

  const geoRef = useRef({});
  geoRef.current = {
    interiorLeftPx, interiorRightPx, interiorTopPx, interiorBottomPx,
    compartmentCount, cabins, doorWidthPx,
    doors, nDoors, hasDivider, VIEW_WIDTH, VIEW_HEIGHT,
  };

  // ── New-item drag (palette chip → cabin) ──────────────────────────────
  // Separate from the existing-item drag above. Tracks a chip being dragged
  // from the right-hand palette; on drop over a cabin it adds the item at the
  // snapped drop height. `clientX/Y` drive a cursor-following ghost.
  const [newDrag, setNewDrag] = useState(null);
  const newDragRef = useRef(null);
  const newDragActive = newDrag != null;

  function onPalettePointerDown(e, type) {
    e.preventDefault();
    const nd = {
      type,
      clientX: e.clientX,
      clientY: e.clientY,
      overCanvas: false,
      targetDoorId: null,
      y: null,
    };
    newDragRef.current = nd;
    setNewDrag(nd);
  }

  useEffect(() => {
    if (!newDragActive) return;

    function onMove(e) {
      const nd = newDragRef.current;
      if (!nd) return;
      const geo = geoRef.current;
      const rect = svgRef.current?.getBoundingClientRect();
      let next = {
        ...nd,
        clientX: e.clientX,
        clientY: e.clientY,
        overCanvas: false,
        targetDoorId: null,
        y: null,
      };
      if (rect) {
        const svgX = (e.clientX - rect.left) * (geo.VIEW_WIDTH / rect.width);
        const svgY = (e.clientY - rect.top) * (geo.VIEW_HEIGHT / rect.height);
        const inX = svgX >= geo.interiorLeftPx && svgX <= geo.interiorRightPx;
        const inY =
          svgY >= geo.interiorTopPx - 24 && svgY <= geo.interiorBottomPx + 24;
        if (inX && inY) {
          const rawDoor = Math.floor((svgX - geo.interiorLeftPx) / geo.doorWidthPx);
          const di = Math.max(0, Math.min(geo.nDoors - 1, rawDoor));
          const cabin = geo.cabins.find((c) => di >= c.startDoor && di < c.startDoor + c.size);
          next.targetDoorId = cabin?.doorId ?? geo.doors[0]?.id ?? null;
          next.overCanvas = !!next.targetDoorId;
          // External drawers are pinned to the bottom slot — the preview
          // always shows at the bottom so the user sees where it will land.
          next.y = isExternalDrawerType(next.type, paletteRef.current)
            ? SNAP_POSITIONS[0]
            : snapToSlot(pxToY(svgY));
        }
      }
      newDragRef.current = next;
      setNewDrag(next);
    }

    function onEnd() {
      const nd = newDragRef.current;
      if (nd && nd.overCanvas && nd.targetDoorId && nd.y != null) {
        const all = allItemsRef.current ?? {};
        const existing = all[nd.targetDoorId] ?? [];
        // Enforce max-per-cabin at drop time (clearer than blocking later).
        const cid = typeof nd.type === "string" && nd.type.startsWith("c:") ? parseInt(nd.type.slice(2)) : null;
        const comp = cid ? (paletteRef.current ?? []).find((c) => c.id === cid) : null;
        const maxPer = comp?.max_per_cabin ?? 0;
        const isExtDrawer = isExternalDrawerType(nd.type, paletteRef.current);
        const conflict = existing.some((it) => Math.abs(it.y - nd.y) < SLOT_EPS);
        if (maxPer > 0 && existing.filter((it) => it.type === nd.type).length >= maxPer) {
          showNotice(`ניתן להוסיף עד ${maxPer} ${comp?.name ?? "פריטים"} בכל תא`);
        } else if (isExtDrawer) {
          // External drawer → always the lowest free slot (it renders at the
          // bottom in 3D). Drop height is ignored; extra ones stack upward.
          const idx = findFreeSlotIndex(existing, "external_drawer");
          if (idx == null) {
            showNotice("אין מקום פנוי לפריט נוסף בתא.");
          } else {
            onChangeRef.current({
              ...all,
              [nd.targetDoorId]: [
                ...existing.map((it) => ({ type: it.type, y: it.y })),
                { type: nd.type, y: SNAP_POSITIONS[idx] },
              ],
            });
          }
        } else if (conflict) {
          // The exact drop slot is taken — fall back to the nearest free slot.
          const idx = findFreeSlotIndex(existing, nd.type);
          if (idx == null) {
            showNotice("אין מקום פנוי לפריט נוסף בתא.");
          } else {
            onChangeRef.current({
              ...all,
              [nd.targetDoorId]: [
                ...existing.map((it) => ({ type: it.type, y: it.y })),
                { type: nd.type, y: SNAP_POSITIONS[idx] },
              ],
            });
          }
        } else {
          onChangeRef.current({
            ...all,
            [nd.targetDoorId]: [
              ...existing.map((it) => ({ type: it.type, y: it.y })),
              { type: nd.type, y: nd.y },
            ],
          });
        }
      }
      newDragRef.current = null;
      setNewDrag(null);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    window.addEventListener("blur", onEnd);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      window.removeEventListener("blur", onEnd);
    };
  }, [newDragActive, pxToY]);

  const [notice, setNotice] = useState(null);
  const noticeTimerRef = useRef(null);
  useEffect(() => () => { clearTimeout(noticeTimerRef.current); }, []);
  function showNotice(message) {
    setNotice(message);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = null;
    }, 3200);
  }

  // Remove an item from ANY compartment (not just the active one) — the planner
  // now lets the user edit every cabin directly without selecting it first.
  function removeItemFrom(doorId, originalIdx) {
    const cur = items?.[doorId] ?? [];
    const itemToRemove = cur[originalIdx];
    const isShelf = (type) => {
      if (type === "shelf") return true;
      const compId = type?.startsWith("c:") ? parseInt(type.slice(2)) : null;
      return compId ? (paletteComponents?.find(c => c.id === compId)?.item_type === "shelf") : false;
    };
    if (isShelf(itemToRemove?.type)) {
      const shelfCount = cur.filter((it) => isShelf(it.type)).length;
      if (shelfCount <= 2) return;
    }
    onChange({
      ...items,
      [doorId]: cur
        .filter((_, i) => i !== originalIdx)
        .map((it) => ({ type: it.type, y: it.y })),
    });
  }

  const onItemPointerDown = useCallback((e, originalIdx, sourceDoorId) => {
    e.stopPropagation();
    const item = (allItemsRef.current?.[sourceDoorId] ?? [])[originalIdx];
    if (!item) return;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    const preview = {
      sourceDoorId,
      sourceIndex: originalIdx,
      doorId: sourceDoorId,
      y: item.y,
      type: item.type,
    };
    dragPreviewRef.current = preview;
    setDragPreview(preview);
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    function onMove(e) {
      if (!svgRef.current || !dragPreviewRef.current) return;

      const startPos = dragStartPos.current;
      if (startPos) {
        if (
          Math.abs(e.clientX - startPos.x) < 6 &&
          Math.abs(e.clientY - startPos.y) < 6
        ) return;
        dragStartPos.current = null;
      }

      const rect = svgRef.current.getBoundingClientRect();
      const geo = geoRef.current;
      const svgX = (e.clientX - rect.left) * (geo.VIEW_WIDTH / rect.width);
      const svgY = (e.clientY - rect.top) * (geo.VIEW_HEIGHT / rect.height);

      let targetDoorId = dragPreviewRef.current.sourceDoorId;
      {
        const rawDoor = Math.floor((svgX - geo.interiorLeftPx) / geo.doorWidthPx);
        const di = Math.max(0, Math.min(geo.nDoors - 1, rawDoor));
        const cabin = geo.cabins.find((c) => di >= c.startDoor && di < c.startDoor + c.size);
        targetDoorId = cabin?.doorId ?? targetDoorId;
      }

      const prev = dragPreviewRef.current;
      // External drawers stay pinned to the bottom slot — they can move
      // between cabins but never up/down within one.
      const snappedY = isExternalDrawerType(prev.type, paletteRef.current)
        ? SNAP_POSITIONS[0]
        : snapToSlot(pxToY(svgY));
      if (prev.doorId === targetDoorId && prev.y === snappedY) return;

      const next = { ...prev, doorId: targetDoorId, y: snappedY };
      dragPreviewRef.current = next;
      setDragPreview(next);
    }

    function onEnd() {
      const preview = dragPreviewRef.current;
      if (preview) {
        const allItems = allItemsRef.current ?? {};
        const originalItem =
          (allItems[preview.sourceDoorId] ?? [])[preview.sourceIndex];

        const isNoOp =
          preview.doorId === preview.sourceDoorId &&
          originalItem &&
          preview.y === originalItem.y;

        if (!isNoOp) {
          const sourceItems = (allItems[preview.sourceDoorId] ?? []).filter(
            (_, i) => i !== preview.sourceIndex,
          );
          const targetBaseItems =
            preview.doorId === preview.sourceDoorId
              ? sourceItems
              : (allItems[preview.doorId] ?? []);

          const conflict = targetBaseItems.some(
            (it) => Math.abs(it.y - preview.y) < SLOT_EPS,
          );
          if (!conflict) {
            const nextAll = { ...allItems };
            if (preview.doorId === preview.sourceDoorId) {
              nextAll[preview.sourceDoorId] = [
                ...sourceItems,
                { type: preview.type, y: preview.y },
              ];
            } else {
              nextAll[preview.sourceDoorId] = sourceItems;
              nextAll[preview.doorId] = [
                ...targetBaseItems,
                { type: preview.type, y: preview.y },
              ];
            }
            onChangeRef.current(nextAll);
          }
        }
      }

      dragPreviewRef.current = null;
      setDragPreview(null);
      setIsDragging(false);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    window.addEventListener("blur", onEnd);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      window.removeEventListener("blur", onEnd);
    };
  }, [isDragging, pxToY]);

  return (
    <div className="closet-plan">
      <div className="closet-plan__palette">
        <h5 className="closet-plan__palette-title">גררו פריט לארון</h5>
        {(paletteComponents ?? []).map((comp) => {
          const type = `c:${comp.id}`;
          return (
            <button
              key={type}
              type="button"
              className="closet-plan__add-btn closet-plan__drag-chip"
              style={{ touchAction: "none" }}
              onPointerDown={(e) => onPalettePointerDown(e, type)}
            >
              <ItemTypeIcon
                type={comp.item_type}
                className="closet-plan__chip-icon"
                width={42}
                height={28}
              />
              {comp.name}
            </button>
          );
        })}
        <p className="closet-plan__hint">
          גררו מדף, מוט או מגירה אל התא הרצוי בארון, לגובה שתבחרו. אפשר גם לגרור פריט קיים מעלה/מטה או בין התאים. לחיצה על × מסירה פריט. מגירה חיצונית ממוקמת תמיד בתחתית התא.
        </p>
      </div>

      <div className="closet-plan__view-wrap">
        <svg
          ref={svgRef}
          className="closet-plan__svg"
          width={VIEW_WIDTH}
          height={VIEW_HEIGHT}
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          style={{ touchAction: "none" }}
        >
          <rect
            x={bodyLeftPx}
            y={bodyTopPx}
            width={bodyRightPx - bodyLeftPx}
            height={bodyBottomPx - bodyTopPx}
            fill="#ffffff"
            stroke="#94959a"
            strokeWidth={2.5}
            rx={4}
          />
          <rect
            x={interiorLeftPx}
            y={interiorTopPx}
            width={interiorWidthPx}
            height={interiorBottomPx - interiorTopPx}
            fill="rgba(0, 0, 0, 0.025)"
          />

          {/* While an external drawer is being dragged, highlight the bottom of
              the target cabin — it can only be placed there. */}
          {(() => {
            const extTargetId =
              newDrag?.overCanvas && isExternalDrawerType(newDrag.type, paletteComponents)
                ? newDrag.targetDoorId
                : isDragging && dragPreview && isExternalDrawerType(dragPreview.type, paletteComponents)
                ? dragPreview.doorId
                : null;
            if (!extTargetId) return null;
            const cabin = cabins.find((c) => c.doorId === extTargetId);
            if (!cabin) return null;
            const bandTop = yToPx(0.12);
            return (
              <g pointerEvents="none">
                <rect
                  x={cabinLeftPx(cabin)}
                  y={bandTop}
                  width={cabinWidthPx(cabin)}
                  height={interiorBottomPx - bandTop}
                  fill="rgba(79, 70, 229, 0.10)"
                  stroke="rgba(79, 70, 229, 0.55)"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                />
                <text
                  x={cabinCenterPx(cabin)}
                  y={(bandTop + interiorBottomPx) / 2 + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="#4f46e5"
                >
                  תחתית התא
                </text>
              </g>
            );
          })()}

          {doorBoundariesPx.map((x, i) => (
            <line
              key={`door-${i}`}
              x1={x}
              y1={interiorTopPx}
              x2={x}
              y2={interiorBottomPx}
              stroke="rgba(0, 0, 0, 0.12)"
              strokeWidth={1}
              strokeDasharray="3 5"
            />
          ))}

          {doorBoundariesPx.map((x, i) => (
            <rect
              key={`divider-${i}`}
              x={x - wallPx / 2}
              y={interiorTopPx}
              width={wallPx}
              height={interiorBottomPx - interiorTopPx}
              fill="#ffffff"
              stroke="#94959a"
              strokeWidth={1.5}
            />
          ))}

          {compartmentCount > 1 &&
            cabins.map((cabin, i) => {
              const cx = cabinCenterPx(cabin);
              const cy = VIEW_TOP_PAD / 2;
              // Plain black-and-white "תא N" identifier — no active/selected
              // state (every cabin is edited directly by dragging into it).
              const label = `תא ${i + 1}`;
              const pillW = isMobile ? 62 : 52;
              const pillH = isMobile ? 26 : 22;
              return (
                <g key={`compartment-label-${cabin.doorId}`} pointerEvents="none">
                  <rect
                    x={cx - pillW / 2}
                    y={cy - pillH / 2}
                    width={pillW}
                    height={pillH}
                    rx={pillH / 2}
                    fill="#ffffff"
                    stroke="#1d1d1f"
                    strokeWidth={1.5}
                  />
                  <text
                    x={cx}
                    y={cy + (isMobile ? 5 : 4)}
                    textAnchor="middle"
                    fontSize={isMobile ? 13 : 11}
                    fontWeight="700"
                    fill="#1d1d1f"
                  >
                    {label}
                  </text>
                </g>
              );
            })}

          {compartmentCentersPx.map((cx, i) => (
            <line
              key={`axis-${i}`}
              x1={cx}
              y1={interiorTopPx + 2}
              x2={cx}
              y2={interiorBottomPx - 2}
              stroke="rgba(0, 0, 0, 0.10)"
              strokeWidth={1}
              strokeDasharray="3 4"
            />
          ))}

          {cabins.map((cabin) => {
            // Per-cabin gap measurements: each cabin shows its own segment
            // sizes (cm) so the user can read every cabin at once.
            const dItems = items?.[cabin.doorId] ?? [];
            const asc = [...dItems].sort((a, b) => a.y - b.y);
            const segs = [];
            let prevY = 0;
            for (const it of asc) { segs.push({ lowY: prevY, highY: it.y }); prevY = it.y; }
            segs.push({ lowY: prevY, highY: 1 });
            const colCenterX = cabinCenterPx(cabin);
            return (
              <g key={`segs-${cabin.doorId}`} pointerEvents="none">
                {segs.map((seg, i) => {
                  const centerY = (yToPx(seg.lowY) + yToPx(seg.highY)) / 2;
                  const cm = Math.round((seg.highY - seg.lowY) * interiorHeightCm);
                  if (cm < 1) return null;
                  const text = String(cm);
                  const pillW = Math.max(26, text.length * 8 + 10);
                  const pillH = 17;
                  return (
                    <g key={`seg-${cabin.doorId}-${i}`}>
                      <rect
                        x={colCenterX - pillW / 2}
                        y={centerY - pillH / 2}
                        width={pillW}
                        height={pillH}
                        rx={pillH / 2}
                        fill="#eef0fa"
                        stroke="rgba(0, 0, 0, 0.10)"
                        strokeWidth={1}
                      />
                      <text
                        x={colCenterX}
                        y={centerY + 4}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="600"
                        fill="#3a3f55"
                      >
                        {text}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {cabins.map((cabin) => {
            const slice = cabinWidthPx(cabin);
            const sliceLeft = cabinLeftPx(cabin);
            const compItems = items?.[cabin.doorId] ?? [];
            if (compItems.length === 0) return null;
            const isShelf = (type) => {
              if (type === "shelf") return true;
              const cid = type?.startsWith("c:") ? parseInt(type.slice(2)) : null;
              return cid ? (paletteComponents?.find(c => c.id === cid)?.item_type === "shelf") : false;
            };
            const shelfCount = compItems.filter((it) => isShelf(it.type)).length;
            // Every cabin's items are fully interactive — drag, move between
            // cabins, and delete without selecting a cabin first.
            return (
              <g key={`items-${cabin.doorId}`}>
                {compItems.map((item, idx) => {
                  if (
                    dragPreview?.sourceDoorId === cabin.doorId &&
                    dragPreview?.sourceIndex === idx
                  ) return null;
                  const meta = resolveMeta(item.type, paletteComponents);
                  return (
                    <PlacedItem
                      key={`${cabin.doorId}-${idx}`}
                      item={item}
                      originalIdx={idx}
                      leftPx={sliceLeft}
                      widthPx={slice}
                      yToPx={yToPx}
                      isDragging={false}
                      color={meta.color}
                      label={meta.label}
                      renderType={meta.type}
                      onPointerDown={(e, _) => onItemPointerDown(e, idx, cabin.doorId)}
                      canDelete={!isShelf(item.type) || shelfCount > 2}
                      onDelete={() => removeItemFrom(cabin.doorId, idx)}
                    />
                  );
                })}
              </g>
            );
          })}

          {dragPreview && (() => {
            const cabin = cabins.find((c) => c.doorId === dragPreview.doorId);
            if (!cabin) return null;
            const slice = cabinWidthPx(cabin);
            const previewLeft = cabinLeftPx(cabin);
            const previewMeta = resolveMeta(dragPreview.type, paletteComponents);
            return (
              <PlacedItem
                key="drag-preview"
                item={{ type: dragPreview.type, y: dragPreview.y }}
                originalIdx={-1}
                leftPx={previewLeft}
                widthPx={slice}
                yToPx={yToPx}
                isDragging={true}
                color={previewMeta.color}
                label={previewMeta.label}
                renderType={previewMeta.type}
                onPointerDown={() => {}}
                onDelete={() => {}}
              />
            );
          })()}

          {newDrag?.overCanvas && newDrag.targetDoorId && newDrag.y != null && (() => {
            const cabin = cabins.find((c) => c.doorId === newDrag.targetDoorId);
            if (!cabin) return null;
            const slice = cabinWidthPx(cabin);
            const previewLeft = cabinLeftPx(cabin);
            const newMeta = resolveMeta(newDrag.type, paletteComponents);
            return (
              <PlacedItem
                key="new-drag-preview"
                item={{ type: newDrag.type, y: newDrag.y }}
                originalIdx={-1}
                leftPx={previewLeft}
                widthPx={slice}
                yToPx={yToPx}
                isDragging={true}
                color={newMeta.color}
                label={newMeta.label}
                renderType={newMeta.type}
                onPointerDown={() => {}}
                onDelete={() => {}}
              />
            );
          })()}

          <DimensionLineV
            x={LEFT_GUTTER / 2 - 4}
            y1={bodyTopPx}
            y2={bodyBottomPx}
            label={`${Math.round(heightCm)}`}
          />

          {Array.from({ length: nDoors }).map((_, i) => {
            const sliceLeftPx = interiorLeftPx + (interiorWidthPx / nDoors) * i;
            const sliceRightPx = interiorLeftPx + (interiorWidthPx / nDoors) * (i + 1);
            const compW = Math.round(widthCm / nDoors);
            return (
              <DimensionLineH
                key={`width-${i}`}
                x1={sliceLeftPx}
                x2={sliceRightPx}
                y={bodyBottomPx + 22}
                label={`${compW}`}
              />
            );
          })}
          {doorBoundariesPx.map((x, i) => (
            <text
              key={`cross-${i}`}
              x={x}
              y={bodyBottomPx + 27}
              textAnchor="middle"
              fontSize="14"
              fill="#94959a"
            >
              ×
            </text>
          ))}
        </svg>
        {notice && (
          <div className="closet-plan__notice" role="alert">{notice}</div>
        )}
      </div>

      {newDrag && (
        <div
          className="closet-plan__drag-ghost"
          style={{ left: newDrag.clientX, top: newDrag.clientY }}
        >
          {resolveMeta(newDrag.type, paletteComponents).label}
        </div>
      )}
    </div>
  );
}
