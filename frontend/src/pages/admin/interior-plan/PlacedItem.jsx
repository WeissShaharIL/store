export default function PlacedItem({
  item,
  originalIdx,
  leftPx,
  widthPx,
  yToPx,
  isDragging,
  onPointerDown,
  onDelete,
}) {
  const cy = yToPx(item.y);
  const innerInset = 4;
  const innerLeft = leftPx + innerInset;
  const innerWidth = Math.max(20, widthPx - innerInset * 2);
  const innerRight = innerLeft + innerWidth;

  let visual;
  if (item.type === "shelf") {
    visual = (
      <rect
        x={innerLeft}
        y={cy - 4}
        width={innerWidth}
        height={8}
        fill="#a98865"
        stroke="#7a5f43"
        strokeWidth={1}
        rx={2}
      />
    );
  } else if (item.type === "rod") {
    visual = (
      <g>
        <rect
          x={innerLeft}
          y={cy - 11}
          width={innerWidth}
          height={22}
          fill="transparent"
          pointerEvents="all"
        />
        <line
          x1={innerLeft + 6}
          y1={cy}
          x2={innerRight - 6}
          y2={cy}
          stroke="#9aa0a6"
          strokeWidth={5}
          strokeLinecap="round"
          pointerEvents="none"
        />
        <circle
          cx={innerLeft + innerWidth / 2}
          cy={cy}
          r={5}
          fill="#9aa0a6"
          pointerEvents="none"
        />
        <rect
          x={innerLeft + 2}
          y={cy - 7}
          width={6}
          height={14}
          fill="#a98865"
          rx={1}
          pointerEvents="none"
        />
        <rect
          x={innerRight - 8}
          y={cy - 7}
          width={6}
          height={14}
          fill="#a98865"
          rx={1}
          pointerEvents="none"
        />
      </g>
    );
  } else if (item.type === "drawer") {
    visual = (
      <g>
        <rect
          x={innerLeft}
          y={cy - 22}
          width={innerWidth}
          height={44}
          fill="#c4a373"
          stroke="#7a5f43"
          strokeWidth={1}
          rx={3}
        />
        <rect
          x={innerLeft + innerWidth / 2 - 18}
          y={cy + 12}
          width={36}
          height={4}
          fill="#9aa0a6"
          rx={2}
        />
      </g>
    );
  }

  const labelOffsetX = innerLeft + 2;
  const labelY = cy - (item.type === "drawer" ? 28 : 14);
  const deleteCx = innerRight - 4;

  return (
    <g
      className={
        "closet-plan__item" +
        (isDragging ? " closet-plan__item--dragging" : "")
      }
      onPointerDown={(e) => onPointerDown(e, originalIdx)}
      onDragStart={(e) => e.preventDefault()}
      style={{ cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
    >
      {visual}
      <g
        className="closet-plan__item-delete"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onDelete}
        style={{ cursor: "pointer" }}
      >
        <circle
          cx={deleteCx}
          cy={labelY}
          r={18}
          fill="transparent"
          pointerEvents="all"
        />
        <circle cx={deleteCx} cy={labelY} r={13} fill="#fff" stroke="#c44" strokeWidth={1.2} />
        <line x1={deleteCx - 5} y1={labelY - 5} x2={deleteCx + 5} y2={labelY + 5} stroke="#c44" strokeWidth={1.5} />
        <line x1={deleteCx - 5} y1={labelY + 5} x2={deleteCx + 5} y2={labelY - 5} stroke="#c44" strokeWidth={1.5} />
      </g>
      <text
        x={labelOffsetX}
        y={labelY + 3}
        fontSize="11"
        fill="#94959a"
        pointerEvents="none"
      >
        {item.type === "shelf"
          ? "מדף"
          : item.type === "rod"
          ? "מוט"
          : "מגירה"}
      </text>
    </g>
  );
}
