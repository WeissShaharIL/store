import { useHandles, handlesForDoorKind } from "../HandlesContext.jsx";

export default function DoorHandlesPicker({ doors, values, onChange }) {
  const { list } = useHandles();
  if (!doors.length) return null;
  return (
    <div className="door-handles-picker">
      {doors.map((door, i) => {
        const current = values[door.id] ?? "silver";
        const available = handlesForDoorKind(list, door.kind);
        return (
          <div className="door-handles-picker__row" key={door.id}>
            <span className="door-handles-picker__door-label">דלת {i + 1}</span>
            <div className="door-handles-picker__swatches">
              {available.map((h) => {
                const isActive = h.handle_key === current;
                return (
                  <button
                    type="button"
                    key={h.handle_key}
                    className={"door-handles-picker__swatch" + (isActive ? " door-handles-picker__swatch--active" : "")}
                    onClick={() => onChange(door.id, h.handle_key)}
                    aria-pressed={isActive}
                    title={h.name}
                  >
                    <span className="door-handles-picker__bar" style={{ background: h.color }} />
                    <span className="door-handles-picker__name">{h.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
