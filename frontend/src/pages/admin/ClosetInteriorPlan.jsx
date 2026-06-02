import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SNAP_POSITIONS,
  SLOT_EPS,
  snapToSlot,
  findFreeSlotIndex,
} from "./interior-plan/slots.js";
import PlacedItem from "./interior-plan/PlacedItem.jsx";
import {
  DimensionLineV,
  DimensionLineH,
} from "./interior-plan/DimensionLines.jsx";

// Draggable item palette (right side). Users drag these chips onto a cabin
// instead of clicking a "+" button — the drop height decides the slot.
const PALETTE = [
  { type: "shelf", label: "מדף", color: "#8b6f47" },
  { type: "rod", label: "מוט תליה", color: "#9a9a9f" },
  { type: "drawer", label: "מגירה", color: "#6f7787" },
];

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

export default function ClosetInteriorPlan({ cfg, items, onChange }) {
  const doors = cfg.doors ?? [];
  const nDoors = Math.max(1, doors.length);
  const hasDivider = !!cfg.hasInternalDivider;
  const compartmentCount = hasDivider ? nDoors : 1;

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
  const aspectRatio = widthCm / heightCm;

  const widthIfFillH = drawableH * aspectRatio;
  let CABINET_WIDTH_PX;
  let CABINET_HEIGHT_PX;
  if (widthIfFillH <= drawableW) {
    CABINET_WIDTH_PX = widthIfFillH;
    CABINET_HEIGHT_PX = drawableH;
  } else {
    CABINET_WIDTH_PX = drawableW;
    CABINET_HEIGHT_PX = drawableW / aspectRatio;
  }
  const cmPerPx = heightCm / CABINET_HEIGHT_PX;

  const verticalSlack = drawableH - CABINET_HEIGHT_PX;
  const bodyLeftPx = LEFT_GUTTER;
  const bodyRightPx = LEFT_GUTTER + CABINET_WIDTH_PX;
  const bodyTopPx = VIEW_TOP_PAD + verticalSlack / 2;
  const bodyBottomPx = bodyTopPx + CABINET_HEIGHT_PX;
  const wallPx = T / cmPerPx;
  const interiorLeftPx = bodyLeftPx + wallPx;
  const interiorRightPx = bodyRightPx - wallPx;
  const interiorTopPx = bodyTopPx + wallPx;
  const interiorBottomPx = bodyBottomPx - wallPx;
  const interiorWidthPx = interiorRightPx - interiorLeftPx;
  const compartmentWidthPx = interiorWidthPx / compartmentCount;

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

  const doorBoundariesPx = useMemo(() => {
    const out = [];
    const doorWidthPx = interiorWidthPx / nDoors;
    for (let i = 1; i < nDoors; i++) {
      out.push(interiorLeftPx + i * doorWidthPx);
    }
    return out;
  }, [interiorLeftPx, interiorWidthPx, nDoors]);

  const compartmentCentersPx = useMemo(() => {
    const out = [];
    const slice = interiorWidthPx / compartmentCount;
    for (let i = 0; i < compartmentCount; i++) {
      out.push(interiorLeftPx + slice * (i + 0.5));
    }
    return out;
  }, [interiorLeftPx, interiorWidthPx, compartmentCount]);

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

  const geoRef = useRef({});
  geoRef.current = {
    interiorLeftPx, interiorRightPx, interiorTopPx, interiorBottomPx,
    compartmentWidthPx, compartmentCount,
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
          let di = 0;
          if (geo.hasDivider && geo.compartmentCount > 1) {
            const raw = Math.floor(
              (svgX - geo.interiorLeftPx) / geo.compartmentWidthPx,
            );
            di = Math.max(0, Math.min(geo.compartmentCount - 1, raw));
          }
          next.targetDoorId = geo.doors[di]?.id ?? null;
          next.overCanvas = !!next.targetDoorId;
          next.y = snapToSlot(pxToY(svgY));
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
        const conflict = existing.some((it) => Math.abs(it.y - nd.y) < SLOT_EPS);
        if (conflict) {
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
    if (itemToRemove?.type === "shelf") {
      const shelfCount = cur.filter((it) => it.type === "shelf").length;
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
      if (geo.hasDivider && geo.compartmentCount > 1) {
        const rawIdx = Math.floor(
          (svgX - geo.interiorLeftPx) / geo.compartmentWidthPx,
        );
        const clampedIdx = Math.max(0, Math.min(geo.compartmentCount - 1, rawIdx));
        targetDoorId = geo.doors[clampedIdx]?.id ?? targetDoorId;
      }

      const snappedY = snapToSlot(pxToY(svgY));
      const prev = dragPreviewRef.current;
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
        {PALETTE.map((p) => (
          <button
            key={p.type}
            type="button"
            className="closet-plan__add-btn closet-plan__drag-chip"
            style={{ touchAction: "none" }}
            onPointerDown={(e) => onPalettePointerDown(e, p.type)}
          >
            <span
              className="closet-plan__chip-swatch"
              style={{ background: p.color }}
              aria-hidden="true"
            />
            {p.label}
          </button>
        ))}
        <p className="closet-plan__hint">
          גררו מדף, מוט או מגירה אל התא הרצוי בארון, לגובה שתבחרו. אפשר גם לגרור פריט קיים מעלה/מטה או בין התאים. לחיצה על × מסירה פריט.
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

          {hasDivider &&
            doorBoundariesPx.map((x, i) => (
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
            doors.map((door, i) => {
              const slice = interiorWidthPx / compartmentCount;
              const cx = interiorLeftPx + (i + 0.5) * slice;
              const cy = VIEW_TOP_PAD / 2;
              // Plain black-and-white "תא N" identifier — no active/selected
              // state (every cabin is edited directly by dragging into it).
              const label = `תא ${i + 1}`;
              const pillW = isMobile ? 62 : 52;
              const pillH = isMobile ? 26 : 22;
              return (
                <g key={`compartment-label-${door.id}`} pointerEvents="none">
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

          {doors.map((door, di) => {
            // Per-compartment gap measurements: each cabin shows its own
            // segment sizes (cm) so the user can read every cabin at once,
            // not only the selected one.
            if (!hasDivider && di > 0) return null;
            const dItems = items?.[door.id] ?? [];
            const asc = [...dItems].sort((a, b) => a.y - b.y);
            const segs = [];
            let prevY = 0;
            for (const it of asc) { segs.push({ lowY: prevY, highY: it.y }); prevY = it.y; }
            segs.push({ lowY: prevY, highY: 1 });
            const slice = hasDivider ? interiorWidthPx / nDoors : interiorWidthPx;
            const colCenterX = (hasDivider ? interiorLeftPx + di * slice : interiorLeftPx) + slice / 2;
            return (
              <g key={`segs-${door.id}`} pointerEvents="none">
                {segs.map((seg, i) => {
                  const centerY = (yToPx(seg.lowY) + yToPx(seg.highY)) / 2;
                  const cm = Math.round((seg.highY - seg.lowY) * interiorHeightCm);
                  if (cm < 1) return null;
                  const text = String(cm);
                  const pillW = Math.max(26, text.length * 8 + 10);
                  const pillH = 17;
                  return (
                    <g key={`seg-${door.id}-${i}`}>
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

          {doors.map((door, di) => {
            const slice = hasDivider ? interiorWidthPx / nDoors : interiorWidthPx;
            const sliceLeft = hasDivider
              ? interiorLeftPx + di * slice
              : interiorLeftPx;
            const compItems = items?.[door.id] ?? [];
            if (compItems.length === 0) return null;
            const shelfCount = compItems.filter((it) => it.type === "shelf").length;
            // Every compartment's items are now fully interactive — drag,
            // move between cabins, and delete without selecting a cabin first.
            return (
              <g key={`items-${door.id}`}>
                {compItems.map((item, idx) => {
                  if (
                    dragPreview?.sourceDoorId === door.id &&
                    dragPreview?.sourceIndex === idx
                  ) return null;
                  return (
                    <PlacedItem
                      key={`${door.id}-${idx}`}
                      item={item}
                      originalIdx={idx}
                      leftPx={sliceLeft}
                      widthPx={slice}
                      yToPx={yToPx}
                      isDragging={false}
                      onPointerDown={(e, _) => onItemPointerDown(e, idx, door.id)}
                      canDelete={item.type !== "shelf" || shelfCount > 2}
                      onDelete={() => removeItemFrom(door.id, idx)}
                    />
                  );
                })}
              </g>
            );
          })}

          {dragPreview && (() => {
            const di = doors.findIndex((d) => d.id === dragPreview.doorId);
            if (di < 0) return null;
            const slice = hasDivider ? interiorWidthPx / nDoors : interiorWidthPx;
            const previewLeft = hasDivider
              ? interiorLeftPx + di * slice
              : interiorLeftPx;
            return (
              <PlacedItem
                key="drag-preview"
                item={{ type: dragPreview.type, y: dragPreview.y }}
                originalIdx={-1}
                leftPx={previewLeft}
                widthPx={slice}
                yToPx={yToPx}
                isDragging={true}
                onPointerDown={() => {}}
                onDelete={() => {}}
              />
            );
          })()}

          {newDrag?.overCanvas && newDrag.targetDoorId && newDrag.y != null && (() => {
            const di = doors.findIndex((d) => d.id === newDrag.targetDoorId);
            if (di < 0) return null;
            const slice = hasDivider ? interiorWidthPx / nDoors : interiorWidthPx;
            const previewLeft = hasDivider
              ? interiorLeftPx + di * slice
              : interiorLeftPx;
            return (
              <PlacedItem
                key="new-drag-preview"
                item={{ type: newDrag.type, y: newDrag.y }}
                originalIdx={-1}
                leftPx={previewLeft}
                widthPx={slice}
                yToPx={yToPx}
                isDragging={true}
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
          {PALETTE.find((p) => p.type === newDrag.type)?.label}
        </div>
      )}
    </div>
  );
}
