export function DimensionLineV({ x, y1, y2, label }) {
  const midY = (y1 + y2) / 2;
  return (
    <g pointerEvents="none">
      <line x1={x} y1={y1} x2={x} y2={y2} stroke="#94959a" strokeWidth={1} />
      <line x1={x - 4} y1={y1} x2={x + 4} y2={y1} stroke="#94959a" strokeWidth={1} />
      <line x1={x - 4} y1={y2} x2={x + 4} y2={y2} stroke="#94959a" strokeWidth={1} />
      <text
        x={x - 6}
        y={midY}
        textAnchor="middle"
        fontSize="12"
        fontWeight="600"
        fill="#1f2330"
        transform={`rotate(-90 ${x - 6} ${midY})`}
      >
        {label}
      </text>
    </g>
  );
}

export function DimensionLineH({ x1, x2, y, label }) {
  const midX = (x1 + x2) / 2;
  return (
    <g pointerEvents="none">
      <line x1={x1} y1={y} x2={x2} y2={y} stroke="#94959a" strokeWidth={1} />
      <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} stroke="#94959a" strokeWidth={1} />
      <line x1={x2} y1={y - 4} x2={x2} y2={y + 4} stroke="#94959a" strokeWidth={1} />
      <text
        x={midX}
        y={y + 14}
        textAnchor="middle"
        fontSize="11"
        fontWeight="600"
        fill="#1f2330"
      >
        {label}
      </text>
    </g>
  );
}
