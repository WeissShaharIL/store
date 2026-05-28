export default function DoorMaterialsPicker({ doors, values, onChange }) {
  if (!doors.length) return null;
  return (
    <div className="door-materials-picker">
      {doors.map((door, i) => {
        const current = values[door.id] ?? "wood";
        const isGlass = current === "glass";
        const hasMirror = current === "mirror";
        const setGlass = (g) => onChange(door.id, g ? "glass" : "wood");
        const setMirror = (m) => onChange(door.id, m ? "mirror" : "wood");
        return (
          <div className="door-materials-picker__row" key={door.id}>
            <span className="door-materials-picker__door-label">דלת {i + 1}</span>
            <label className="door-materials-picker__option">
              <input type="checkbox" checked={isGlass} onChange={(e) => setGlass(e.target.checked)} />
              <span>זכוכית</span>
            </label>
            <label className={"door-materials-picker__option" + (isGlass ? " door-materials-picker__option--disabled" : "")}>
              <input type="checkbox" checked={hasMirror && !isGlass} disabled={isGlass} onChange={(e) => setMirror(e.target.checked)} />
              <span>מראה בצד הפנימי</span>
            </label>
          </div>
        );
      })}
    </div>
  );
}
