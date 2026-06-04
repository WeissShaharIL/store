// Generic colored-bar renderer — all interior items look the same,
// distinguished only by color and label (set on the component in admin).
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
}) {
  const cy = yToPx(item.y);
  const inset = 4;
  const barLeft   = leftPx + inset;
  const barWidth  = Math.max(20, widthPx - inset * 2);
  const barRight  = barLeft + barWidth;
  const barH      = 18;
  const barTop    = cy - barH / 2;
  const deleteCy  = barTop - 10;
  const deleteCx  = barRight - 6;

  // Slightly darker border: blend toward black
  const borderColor = "rgba(0,0,0,0.35)";

  return (
    <g
      className={"closet-plan__item" + (isDragging ? " closet-plan__item--dragging" : "")}
      onPointerDown={(e) => onPointerDown(e, originalIdx)}
      onDragStart={(e) => e.preventDefault()}
      style={{ cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
    >
      {/* Colored bar */}
      <rect
        x={barLeft}
        y={barTop}
        width={barWidth}
        height={barH}
        fill={color}
        stroke={borderColor}
        strokeWidth={1}
        rx={3}
        pointerEvents="all"
      />
      {/* Label centered in bar */}
      <text
        x={barLeft + barWidth / 2}
        y={cy + 4}
        fontSize="10"
        fill="rgba(255,255,255,0.85)"
        textAnchor="middle"
        pointerEvents="none"
        style={{ userSelect: "none" }}
      >
        {label}
      </text>

      {/* Delete button above the bar */}
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
