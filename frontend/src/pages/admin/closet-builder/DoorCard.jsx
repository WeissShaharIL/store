/**
 * Door + compartment editor card — and the section wrapper that
 * lists all the door cards plus the "+ הוסף דלת + תא" / "פתח הכל"
 * controls.
 *
 * v1.22.0 design: doors and compartments are 1:1. Each card
 * controls one door's geometry (kind, side, drawerStack/split,
 * material) AND its compartment contents (variants + items).
 *
 * Extracted from DevClosetBuilder.jsx in v1.46.0.
 */

import { Plus, Trash, Eye, EyeOff } from "../../../components/Icons.jsx";
import { withClone } from "./helpers.js";
import { newDoor } from "./defaults.js";
import { TextField } from "./Fields.jsx";

function DoorCard({
  config,
  setConfig,
  doorIndex,
  selectedItem,
  setSelectedItem,
  doorState,
  setDoorState,
  activeVariantId,
  setActiveVariantId,
}) {
  const door = config.doors[doorIndex];
  // The active variant is the one currently being edited AND the one
  // the 3D preview renders for this door's compartment (parent wires
  // it into previewState.compartmentVariants). Falls back to the
  // first variant if the active id is stale (e.g. just removed).
  const activeVariant =
    door.compartment.variants.find((v) => v.id === activeVariantId) ??
    door.compartment.variants[0];

  function setDoor(fn) {
    setConfig(withClone(config, (d) => fn(d.doors[doorIndex])));
  }
  function setVariant(fn) {
    setDoor((d) => {
      const v =
        d.compartment.variants.find((x) => x.id === activeVariantId) ??
        d.compartment.variants[0];
      fn(v);
    });
  }
  function addItem(type) {
    setVariant((v) => { v.items.push({ type, y: 0.5 }); });
  }
  function updateItem(i, fn) {
    setVariant((v) => fn(v.items[i]));
  }
  function removeItem(i) {
    setVariant((v) => { v.items.splice(i, 1); });
    if (selectedItem && selectedItem.doorIndex === doorIndex && selectedItem.itemIndex === i) {
      setSelectedItem(null);
    }
  }
  function addVariant() {
    // Generate the new variant's id BEFORE mutating so we can both
    // push it and select it. Using `Date.now()` keeps ids unique
    // across rapid adds (the prior length-based scheme collided
    // after a remove + add cycle).
    const id = `variant-${Date.now()}`;
    setDoor((d) => {
      d.compartment.variants.push({
        id,
        label: `תצורה ${d.compartment.variants.length + 1}`,
        items: [],
      });
    });
    setActiveVariantId(id);
  }
  function removeVariant(id) {
    if (door.compartment.variants.length <= 1) return;
    // Pick the survivor BEFORE the mutation so the active-variant
    // switch uses fresh data, not a stale reference.
    const survivors = door.compartment.variants.filter((v) => v.id !== id);
    setDoor((d) => {
      d.compartment.variants = d.compartment.variants.filter((v) => v.id !== id);
      if (d.compartment.defaultVariant === id) {
        d.compartment.defaultVariant = d.compartment.variants[0].id;
      }
    });
    if (activeVariantId === id) setActiveVariantId(survivors[0].id);
  }

  function removeDoor() {
    if (config.doors.length <= 1) return;
    setConfig(withClone(config, (d) => { d.doors.splice(doorIndex, 1); }));
    if (selectedItem?.doorIndex === doorIndex) setSelectedItem(null);
  }

  return (
    <div className="closet-builder__group closet-builder__door-card">
      <div className="closet-builder__door-header">
        <h4 className="closet-builder__group-title">דלת + תא #{doorIndex + 1}</h4>
        <div className="closet-builder__door-actions">
          <div
            className="closet-builder__door-vis"
            role="radiogroup"
            aria-label="מצב הדלת בתצוגה"
          >
            {[
              { id: "closed", label: "סגורה" },
              { id: "open",   label: "פתוחה" },
              { id: "hidden", label: "מוסתרת" },
            ].map((opt) => {
              const active = (doorState ?? "closed") === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={
                    "closet-builder__door-vis-btn" +
                    (active ? " closet-builder__door-vis-btn--active" : "")
                  }
                  onClick={() => setDoorState(opt.id)}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {config.doors.length > 1 && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={removeDoor} title="הסר דלת ותא">
              <Trash />
            </button>
          )}
        </div>
      </div>
      <div className="closet-builder__row">
        <TextField
          label="תווית דלת"
          value={door.label}
          onChange={(v) => setDoor((d) => { d.label = v; })}
        />
        {/* v1.56.0 — per-door kind picker removed. Closet kind is
            set at the top level (BasicsEditor). track / hingeSide
            now read from the closet's kind. */}
        {door.kind === "sliding" && (
          <div className="field field--small">
            <span>מסילה</span>
            <div className="closet-builder__door-vis" role="radiogroup" aria-label="מסילה">
              {[{v:"back",l:"אחורית"},{v:"front",l:"קדמית"}].map(({v,l}) => (
                <button key={v} type="button" role="radio" aria-checked={(door.track ?? "back") === v}
                  className={"closet-builder__door-vis-btn" + ((door.track ?? "back") === v ? " closet-builder__door-vis-btn--active" : "")}
                  onClick={() => setDoor((d) => { d.track = v; })}
                >{l}</button>
              ))}
            </div>
          </div>
        )}
        {door.kind === "hinged" && (
          <div className="field field--small">
            <span>כיוון פתיחה</span>
            <div className="closet-builder__door-vis" role="radiogroup" aria-label="כיוון פתיחה">
              {[{v:"left",l:"צירים בשמאל"},{v:"right",l:"צירים בימין"}].map(({v,l}) => (
                <button key={v} type="button" role="radio" aria-checked={(door.hingeSide ?? "left") === v}
                  className={"closet-builder__door-vis-btn" + ((door.hingeSide ?? "left") === v ? " closet-builder__door-vis-btn--active" : "")}
                  onClick={() => setDoor((d) => { d.hingeSide = v; })}
                >{l}</button>
              ))}
            </div>
          </div>
        )}
        <div className="field field--small">
          <span>קיצור</span>
          <div className="closet-builder__door-vis" role="radiogroup" aria-label="קיצור">
            {[{v:0,l:"ללא"},{v:1,l:"+ מגירה"},{v:2,l:"+ 2 מגירות"}].map(({v,l}) => (
              <button key={v} type="button" role="radio" aria-checked={(door.drawerStack ?? 0) === v}
                className={"closet-builder__door-vis-btn" + ((door.drawerStack ?? 0) === v ? " closet-builder__door-vis-btn--active" : "")}
                onClick={() => setDoor((d) => { d.drawerStack = v; })}
              >{l}</button>
            ))}
          </div>
        </div>
        {(door.drawerStack ?? 0) > 0 && (
          <div className="field field--small">
            <span>פיצול מגירות</span>
            <div className="closet-builder__door-vis" role="radiogroup" aria-label="פיצול מגירות">
              {[{v:false,l:"ללא"},{v:true,l:"לשניים"}].map(({v,l}) => (
                <button key={String(v)} type="button" role="radio" aria-checked={!!door.drawerSplit === v}
                  className={"closet-builder__door-vis-btn" + (!!door.drawerSplit === v ? " closet-builder__door-vis-btn--active" : "")}
                  onClick={() => setDoor((d) => { d.drawerSplit = v; })}
                >{l}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="closet-builder__row">
        <div className="field field--small">
          <span>חומר ברירת מחדל</span>
          <div className="closet-builder__door-vis" role="radiogroup" aria-label="חומר ברירת מחדל">
            {door.materialChoices.map((mc) => (
              <button key={mc.id} type="button" role="radio" aria-checked={(door.defaultMaterial ?? "wood") === mc.id}
                className={"closet-builder__door-vis-btn" + ((door.defaultMaterial ?? "wood") === mc.id ? " closet-builder__door-vis-btn--active" : "")}
                onClick={() => setDoor((d) => { d.defaultMaterial = mc.id; })}
              >{mc.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Compartment editor */}
      <div className="closet-builder__compartment">
        <div className="closet-builder__label">תכולת תא</div>

        <div className="closet-builder__variant-tabs">
          {door.compartment.variants.map((v) => (
            <button
              key={v.id}
              type="button"
              className={
                "closet-builder__variant-tab" +
                (activeVariantId === v.id ? " closet-builder__variant-tab--active" : "")
              }
              onClick={() => setActiveVariantId(v.id)}
            >
              {v.label ?? v.id}
              {door.compartment.variants.length > 1 && (
                <span
                  className="closet-builder__variant-x"
                  onClick={(e) => { e.stopPropagation(); removeVariant(v.id); }}
                  aria-label="הסר תצורה"
                  role="button"
                  tabIndex={0}
                >×</span>
              )}
            </button>
          ))}
          <button
            type="button"
            className="closet-builder__variant-tab closet-builder__variant-tab--add"
            onClick={addVariant}
          >
            <Plus /> תצורה
          </button>
        </div>

        {door.compartment.variants.length > 1 && (
          <label className="field field--small">
            <span>תווית תצורה זו</span>
            <input
              type="text"
              value={activeVariant.label ?? ""}
              onChange={(e) => setVariant((v) => { v.label = e.target.value; })}
            />
          </label>
        )}

        <ol className="closet-builder__items">
          {activeVariant.items.map((item, i) => {
            const isSelected =
              selectedItem &&
              selectedItem.doorIndex === doorIndex &&
              selectedItem.itemIndex === i;
            return (
              <li
                key={i}
                className={"closet-builder__item" + (isSelected ? " closet-builder__item--selected" : "")}
                onClick={() => setSelectedItem({ doorIndex, itemIndex: i })}
              >
                <div className="closet-builder__item-type">
                  {[{v:"shelf",l:"מדף"},{v:"rod",l:"מוט"},{v:"drawer",l:"מגירה"}].map(({v,l}) => (
                    <button
                      key={v}
                      type="button"
                      className={"closet-builder__item-type-btn" + (item.type === v ? " closet-builder__item-type-btn--active" : "")}
                      onClick={(e) => { e.stopPropagation(); updateItem(i, (it) => { it.type = v; }); }}
                    >{l}</button>
                  ))}
                </div>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={item.y}
                  onChange={(e) => updateItem(i, (it) => { it.y = Number(e.target.value); })}
                  title="גובה יחסי 0..1"
                />
                <button type="button" className="btn btn--ghost btn--sm" onClick={(e) => { e.stopPropagation(); removeItem(i); }}>
                  <Trash />
                </button>
              </li>
            );
          })}
        </ol>
        <div className="closet-builder__item-add">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => addItem("shelf")}>
            <Plus /> מדף
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => addItem("rod")}>
            <Plus /> מוט
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => addItem("drawer")}>
            <Plus /> מגירה
          </button>
        </div>
      </div>
    </div>
  );
}

export function DoorsSection({
  config,
  setConfig,
  selectedItem,
  setSelectedItem,
  doorStates,
  setDoorState,
  setAllDoorStates,
  resolveActiveVariantId,
  setActiveVariantForDoor,
}) {
  function addDoor() {
    // v1.56.0 — new doors inherit the closet's kind so the closet
    // stays homogeneous. Fallback to the existing first door's kind
    // for older templates without `config.kind`.
    const kind = config.kind ?? config.doors?.[0]?.kind ?? "hinged";
    setConfig(withClone(config, (d) => {
      d.doors.push(newDoor(d.doors.length, kind));
    }));
  }
  const allOpen =
    config.doors.length > 0 &&
    config.doors.every((d) => doorStates[d.id] === "open");
  return (
    <>
      <div className="closet-builder__doors-header">
        <h4 className="closet-builder__group-title">דלתות ותאים</h4>
        <div className="closet-builder__door-actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setAllDoorStates(allOpen ? "closed" : "open")}
            title={allOpen ? "סגור את כל הדלתות בתצוגה" : "פתח את כל הדלתות בתצוגה"}
          >
            {allOpen ? <EyeOff /> : <Eye />}
            {allOpen ? " סגור הכל" : " פתח הכל"}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={addDoor}>
            <Plus /> הוסף דלת + תא
          </button>
        </div>
      </div>
      {config.doors.map((_, i) => {
        const door = config.doors[i];
        return (
          <DoorCard
            key={door.id}
            config={config}
            setConfig={setConfig}
            doorIndex={i}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
            doorState={doorStates[door.id] ?? "closed"}
            setDoorState={(next) => setDoorState(door.id, next)}
            activeVariantId={resolveActiveVariantId(door)}
            setActiveVariantId={(vid) => setActiveVariantForDoor(door.id, vid)}
          />
        );
      })}
    </>
  );
}
