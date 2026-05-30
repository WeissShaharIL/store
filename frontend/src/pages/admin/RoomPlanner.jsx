import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash, RotateCcw } from "../../components/Icons.jsx";

const ITEM_DEFAULTS = {
  door:  { widthCm: 90,  depthCm: 5,   color: "#cc8a3f", labelKey: "door" },
  bed:   { widthCm: 200, depthCm: 160, color: "#c8b890", labelKey: "bed" },
  chair: { widthCm: 50,  depthCm: 50,  color: "#8fa68e", labelKey: "chair" },
};
const ITEM_LABELS = { door: "דלת", bed: "מיטה", chair: "כיסא", closet: "ארון" };

export default function RoomPlanner({ room, onChange, closetWidthCm, closetDepthCm }) {
  const VIEW_WIDTH = 720;
  const VIEW_HEIGHT = 520;
  const PADDING = 36;

  const cmPerPxX = (room.widthCm + 2) / (VIEW_WIDTH - 2 * PADDING);
  const cmPerPxY = (room.depthCm + 2) / (VIEW_HEIGHT - 2 * PADDING);
  const cmPerPx = Math.max(cmPerPxX, cmPerPxY);
  const roomPx = { w: room.widthCm / cmPerPx, h: room.depthCm / cmPerPx };
  const roomLeft = (VIEW_WIDTH - roomPx.w) / 2;
  const roomTop = (VIEW_HEIGHT - roomPx.h) / 2;

  const closetSaved = room.items.find((it) => it.id === "closet");
  const closet = closetSaved ?? {
    id: "closet",
    type: "closet",
    // x/y are the CENTER of the item in room-cm coords.
    // Clamp so all four edges stay inside the room.
    x: Math.max(closetWidthCm / 2, Math.min(room.widthCm - closetWidthCm / 2, room.widthCm / 2)),
    y: Math.max(closetDepthCm / 2 + 10, closetDepthCm / 2),
    rotation: 0,
    widthCm: closetWidthCm,
    depthCm: closetDepthCm,
  };
  closet.widthCm = closetWidthCm;
  closet.depthCm = closetDepthCm;

  const allItems = closetSaved ? room.items : [closet, ...room.items];

  const svgRef = useRef(null);
  const [selectedId, setSelectedId] = useState("closet");
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);

  const patchItemRef = useRef(null);
  patchItemRef.current = patchItem;

  const geoRef = useRef({});
  geoRef.current = { roomLeft, roomTop, cmPerPx, widthCm: room.widthCm, depthCm: room.depthCm };

  const onItemPointerDown = useCallback((e, item) => {
    e.stopPropagation();
    setSelectedId(item.id);
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const geo = geoRef.current;
    dragRef.current = {
      id: item.id,
      offsetCmX: (e.clientX - rect.left - geo.roomLeft - item.x / geo.cmPerPx) * geo.cmPerPx,
      offsetCmY: (e.clientY - rect.top  - geo.roomTop  - item.y / geo.cmPerPx) * geo.cmPerPx,
    };
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    function onMove(e) {
      const drag = dragRef.current;
      if (!drag || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const geo = geoRef.current;
      const newXcm = (e.clientX - rect.left - geo.roomLeft) * geo.cmPerPx - drag.offsetCmX;
      const newYcm = (e.clientY - rect.top  - geo.roomTop)  * geo.cmPerPx - drag.offsetCmY;
      patchItemRef.current(drag.id, {
        x: Math.max(0, Math.min(geo.widthCm, newXcm)),
        y: Math.max(0, Math.min(geo.depthCm, newYcm)),
      });
    }

    function onEnd() {
      dragRef.current = null;
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
  }, [isDragging]);

  function patchItem(id, patch) {
    const others = room.items.filter((it) => it.id !== id);
    let target =
      room.items.find((it) => it.id === id) ??
      (id === "closet" ? { ...closet } : null);
    if (!target) return;
    onChange({ ...room, items: [...others, { ...target, ...patch }] });
  }

  function addItem(type) {
    const defaults = ITEM_DEFAULTS[type];
    const id = `${type}-${Date.now()}`;
    const jitter = (Math.random() - 0.5) * 60;
    onChange({
      ...room,
      items: [
        ...room.items,
        {
          id,
          type,
          x: room.widthCm / 2 + jitter,
          y: room.depthCm / 2 + jitter,
          rotation: 0,
          widthCm: defaults.widthCm,
          depthCm: defaults.depthCm,
        },
      ],
    });
    setSelectedId(id);
  }

  function removeSelected() {
    if (!selectedId || selectedId === "closet") return;
    onChange({ ...room, items: room.items.filter((it) => it.id !== selectedId) });
    setSelectedId(null);
  }

  function rotateSelected() {
    if (!selectedId) return;
    const target =
      room.items.find((it) => it.id === selectedId) ??
      (selectedId === "closet" ? { ...closet } : null);
    if (!target) return;
    patchItem(selectedId, { rotation: (target.rotation + 90) % 360 });
  }

  const selected = useMemo(() => {
    if (selectedId === "closet") return closet;
    return room.items.find((it) => it.id === selectedId) ?? null;
  }, [selectedId, room.items, closet]);

  return (
    <div className="room-planner">
      <div className="room-planner__controls">
        <h4 className="closet-designer__step-title">תכנון חדר</h4>
        <p className="closet-designer__step-hint">
          הגדר את מידות החדר וגרור פריטים פנימה כדי לראות כיצד הארון ישתלב במרחב.
          הארון משקף את המידות שבחרת בשלב 1.
        </p>

        <div className="room-planner__dim-block">
          <RoomDimSlider
            label="רוחב חדר"
            value={room.widthCm}
            min={200}
            max={800}
            step={10}
            onChange={(v) => onChange({ ...room, widthCm: v })}
          />
          <RoomDimSlider
            label="עומק חדר"
            value={room.depthCm}
            min={200}
            max={800}
            step={10}
            onChange={(v) => onChange({ ...room, depthCm: v })}
          />
        </div>

        <div className="room-planner__palette">
          <h5 className="closet-designer__color-title">הוסף פריט</h5>
          <button type="button" className="closet-plan__add-btn" onClick={() => addItem("door")}>
            <Plus /> דלת חדר
          </button>
          <button type="button" className="closet-plan__add-btn" onClick={() => addItem("bed")}>
            <Plus /> מיטה
          </button>
          <button type="button" className="closet-plan__add-btn" onClick={() => addItem("chair")}>
            <Plus /> כיסא
          </button>
        </div>

        <div className={"room-planner__selected" + (selected ? "" : " room-planner__selected--empty")}>
          {selected ? (
            <>
              <div className="room-planner__selected-label">
                נבחר: <strong>{ITEM_LABELS[selected.type]}</strong>
              </div>
              <div className="room-planner__selected-actions">
                <button type="button" className="room-planner__btn" onClick={rotateSelected}>
                  <RotateCcw /> סובב 90°
                </button>
                {selected.id !== "closet" && (
                  <button type="button" className="room-planner__btn" onClick={removeSelected}>
                    <Trash /> הסר
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="room-planner__selected-placeholder">לחץ על פריט בקנבס כדי לבחור אותו</div>
          )}
        </div>
      </div>

      <div className="room-planner__canvas-wrap">
        <svg
          ref={svgRef}
          className="room-planner__svg"
          width={VIEW_WIDTH}
          height={VIEW_HEIGHT}
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          onPointerDown={() => setSelectedId(null)}
          style={{ touchAction: "none" }}
        >
          <rect
            x={roomLeft}
            y={roomTop}
            width={roomPx.w}
            height={roomPx.h}
            fill="#ffffff"
            stroke="#94959a"
            strokeWidth={2.5}
            rx={4}
          />
          <text
            x={roomLeft + roomPx.w / 2}
            y={roomTop - 10}
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill="#94959a"
          >
            {Math.round(room.widthCm)} ס״מ
          </text>
          <text
            x={roomLeft - 10}
            y={roomTop + roomPx.h / 2}
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill="#94959a"
            transform={`rotate(-90 ${roomLeft - 10} ${roomTop + roomPx.h / 2})`}
          >
            {Math.round(room.depthCm)} ס״מ
          </text>

          {allItems.map((item) => (
            <RoomItem
              key={item.id}
              item={item}
              isSelected={item.id === selectedId}
              roomLeft={roomLeft}
              roomTop={roomTop}
              cmPerPx={cmPerPx}
              onPointerDown={(e) => onItemPointerDown(e, item)}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

function RoomItem({ item, isSelected, roomLeft, roomTop, cmPerPx, onPointerDown }) {
  const widthPx = item.widthCm / cmPerPx;
  const depthPx = item.depthCm / cmPerPx;
  const centerXpx = roomLeft + item.x / cmPerPx;
  const centerYpx = roomTop + item.y / cmPerPx;
  const fill =
    item.type === "closet"
      ? "#e8d8b0"
      : ITEM_DEFAULTS[item.type]?.color ?? "#cccccc";
  const stroke = isSelected ? "#5b21b6" : "rgba(0, 0, 0, 0.35)";
  const strokeWidth = isSelected ? 2.5 : 1.2;

  return (
    <g
      transform={`translate(${centerXpx} ${centerYpx}) rotate(${item.rotation ?? 0})`}
      style={{ cursor: "grab", touchAction: "none" }}
      onPointerDown={onPointerDown}
    >
      <rect
        x={-widthPx / 2}
        y={-depthPx / 2}
        width={widthPx}
        height={depthPx}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        rx={item.type === "closet" ? 2 : 4}
      />
      {item.type === "closet" && (
        <line
          x1={-widthPx / 2}
          y1={depthPx / 2 - 1}
          x2={widthPx / 2}
          y2={depthPx / 2 - 1}
          stroke="#7a5f43"
          strokeWidth={3}
        />
      )}
      {item.type === "door" && (
        <path
          d={`M ${-widthPx / 2} 0 A ${widthPx} ${widthPx} 0 0 1 ${-widthPx / 2 + widthPx} ${-widthPx}`}
          fill="rgba(204, 138, 63, 0.10)"
          stroke="#cc8a3f"
          strokeWidth={1.2}
          strokeDasharray="3 4"
        />
      )}
      <text x={0} y={4} textAnchor="middle" fontSize="11" fontWeight="600" fill="#3a3f55" pointerEvents="none">
        {ITEM_LABELS[item.type]}
      </text>
    </g>
  );
}

function RoomDimSlider({ label, value, min, max, step, onChange }) {
  return (
    <div className="dim-slider">
      <div className="dim-slider__row">
        <span className="dim-slider__label">{label}</span>
        <span className="dim-slider__value">{Math.round(value)} ס״מ</span>
      </div>
      <input
        type="range"
        className="dim-slider__input"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
      <div className="dim-slider__range">
        <span>{min} ס״מ</span>
        <span>{max} ס״מ</span>
      </div>
    </div>
  );
}
