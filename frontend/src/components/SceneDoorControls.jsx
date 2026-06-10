import { DoorIcon, DoorOpen, Eye, EyeOff } from "./Icons.jsx";

/**
 * Overlay controls for a ClosetScene: "open all doors" and "hide all doors".
 * Passed to <ClosetScene overlayActions={...} /> and rendered top-left over the
 * canvas. Wired to the parent's door state:
 *   - open-all toggles every door id in/out of openDoorIds
 *   - hide-all flips state.hideDoors (ClosetFromConfig renders no doors when set)
 */
export default function SceneDoorControls({
  doors = [],
  openDoorIds = [],
  setOpenDoorIds,
  hideDoors = false,
  setHideDoors,
}) {
  const doorIds = doors.map((d) => d.id);
  const allOpen = doorIds.length > 0 && doorIds.every((id) => openDoorIds.includes(id));

  return (
    <div className="closet-scene-actions">
      <button
        type="button"
        className="closet-scene-action-btn"
        onClick={() => setOpenDoorIds(allOpen ? [] : doorIds)}
        aria-pressed={allOpen}
        title={allOpen ? "סגור את כל הדלתות" : "פתח את כל הדלתות"}
        aria-label={allOpen ? "סגור את כל הדלתות" : "פתח את כל הדלתות"}
      >
        {allOpen ? <DoorIcon /> : <DoorOpen />}
      </button>
      <button
        type="button"
        className="closet-scene-action-btn"
        onClick={() => setHideDoors((v) => !v)}
        aria-pressed={hideDoors}
        title={hideDoors ? "הצג את כל הדלתות" : "הסתר את כל הדלתות"}
        aria-label={hideDoors ? "הצג את כל הדלתות" : "הסתר את כל הדלתות"}
      >
        {hideDoors ? <Eye /> : <EyeOff />}
      </button>
    </div>
  );
}
