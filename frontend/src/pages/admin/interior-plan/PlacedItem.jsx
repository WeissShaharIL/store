import {
  ITEM_WOOD,
  ITEM_WOOD_EDGE,
  ITEM_METAL,
  ITEM_HANDLE,
} from "./itemVisuals.jsx";

/**
 * A placed interior item in the stage-2 planner. Draws a depiction that
 * matches the 3D model — a wood shelf board, a metal hanging rod with
 * brackets, a drawer front with a handle — instead of the old generic
 * colored bar (kept only as a fallback for components without a type).
 * Drag / delete behavior is unchanged.
 */
export default function PlacedItem({
  item,
  originalIdx,
  leftPx,
  widthPx,
  yToPx,
  isDragging,
  onPointerDown,
  canDelete = true,
  onDelete,
  color = "#a98865",
  label = "",
  renderType = null,
}) {
  const cy = yToPx(item.y);
  const inset = 4;
  const barLeft = leftPx + inset;
  const barWidth = Math.max(20, widthPx - inset * 2);
  const barRight = barLeft + barWidth;

  // Per-type visual height (the depiction itself; the pointer hit area below
  // is always fat enough to grab comfortably).
  const visualH =
    renderType === "shelf" ? 9 :
    renderType === "rod" ? 16 :
    renderType === "drawer" || renderType === "external_drawer" ? 26 :
    18;
  const visTop = cy - visualH / 2;
  const deleteCy = visTop - 10;
  const deleteCx = barRight - 6;

  // Thin items (shelf/rod) carry their name right above the depiction so the
  // board/pole stays clean; box items (drawers) label inside the front.
  const labelInside = renderType === "drawer" || renderType === "external_drawer" || renderType == null;

  function Depiction() {
    if (renderType === "shelf") {
      return (
        <>
          <rect x={barLeft} y={visTop} width={barWidth} height={6.5} rx={1}
            fill={ITEM_WOOD} stroke={ITEM_WOOD_EDGE} strokeWidth={0.8} />
          <rect x={barLeft} y={visTop + 6.5} width={barWidth} height={2.5} rx={1}
            fill={ITEM_WOOD_EDGE} />
        </>
      );
    }
    if (renderType === "rod") {
      const poleY = cy - 1.75;
      return (
        <>
          <rect x={barLeft} y={visTop} width={4} height={visualH} rx={1.5} fill={ITEM_METAL} />
          <rect x={barRight - 4} y={visTop} width={4} height={visualH} rx={1.5} fill={ITEM_METAL} />
          <rect x={barLeft + 3} y={poleY} width={barWidth - 6} height={3.5} rx={1.75} fill={ITEM_METAL} />
          <rect x={barLeft + 3} y={poleY + 0.7} width={barWidth - 6} height={1} rx={0.5} fill="#c7ccd1" />
        </>
      );
    }
    if (renderType === "drawer" || renderType === "external_drawer") {
      const handleW = Math.min(26, barWidth * 0.3);
      return (
        <>
          <rect x={barLeft} y={visTop} width={barWidth} height={visualH} rx={2}
            fill={ITEM_WOOD} stroke={ITEM_WOOD_EDGE} strokeWidth={1.2} />
          <rect x={barLeft + barWidth / 2 - handleW / 2} y={cy - 1.6}
            width={handleW} height={3.2} rx={1.6} fill={ITEM_HANDLE} />
        </>
      );
    }
    // Fallback: legacy colored bar for components without an item type.
    return (
      <rect x={barLeft} y={visTop} width={barWidth} height={visualH}
        fill={color} stroke="rgba(0,0,0,0.35)" strokeWidth={1} rx={3} />
    );
  }

  return (
    <g
      className={"closet-plan__item" + (isDragging ? " closet-plan__item--dragging" : "")}
      onPointerDown={(e) => onPointerDown(e, originalIdx)}
      onDragStart={(e) => e.preventDefault()}
      style={{ cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
    >
      {/* Fat invisible hit area so thin shelves/rods stay easy to grab. */}
      <rect
        x={barLeft}
        y={cy - 13}
        width={barWidth}
        height={26}
        fill="transparent"
        pointerEvents="all"
      />
      <Depiction />
      {label && (
        labelInside && visualH >= 18 ? (
          <text
            x={barLeft + barWidth / 2}
            y={renderType ? visTop + 8.5 : cy + 4}
            fontSize="10"
            fontWeight={renderType ? 600 : 400}
            fill={renderType ? "#5a4a33" : "rgba(255,255,255,0.85)"}
            textAnchor="middle"
            pointerEvents="none"
            style={{ userSelect: "none" }}
          >
            {label}
          </text>
        ) : (
          <text
            x={barLeft + barWidth / 2}
            y={visTop - 4}
            fontSize="9"
            fontWeight={600}
            fill="#6b6354"
            textAnchor="middle"
            pointerEvents="none"
            style={{ userSelect: "none" }}
          >
            {label}
          </text>
        )
      )}

      {/* Delete button above the item */}
      {canDelete && (
        <g
          className="closet-plan__item-delete"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onDelete}
          style={{ cursor: "pointer" }}
        >
          <circle cx={deleteCx} cy={deleteCy} r={18} fill="transparent" pointerEvents="all" />
          <circle cx={deleteCx} cy={deleteCy} r={11} fill="#fff" stroke="#c44" strokeWidth={1.2} />
          <line x1={deleteCx - 4} y1={deleteCy - 4} x2={deleteCx + 4} y2={deleteCy + 4} stroke="#c44" strokeWidth={1.5} />
          <line x1={deleteCx - 4} y1={deleteCy + 4} x2={deleteCx + 4} y2={deleteCy - 4} stroke="#c44" strokeWidth={1.5} />
        </g>
      )}
    </g>
  );
}
