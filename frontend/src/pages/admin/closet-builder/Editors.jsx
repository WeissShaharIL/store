/**
 * Section editors used by the main builder layout: basics
 * (name + base price), dimensions, appearance (color + track
 * rails), and add-ons. The doors+compartment section lives in
 * its own file (DoorCard.jsx) because it's much bigger.
 *
 * Extracted from DevClosetBuilder.jsx in v1.46.0.
 */

import { useState } from "react";
import { Plus, Trash } from "../../../components/Icons.jsx";
import { withClone } from "./helpers.js";
import { ColorPicker, NumberField, TextField, ToggleField } from "./Fields.jsx";
import { DEFAULT_HANDLE } from "../closet3d/palettes.js";
import { useHandles, handlesForDoorKind } from "../HandlesContext.jsx";

export function BasicsEditor({ config, setConfig }) {
  /* v1.56.0 — flipping the closet-level kind also rewrites every
   * door's kind so the closet stays homogeneous. Mixed-kind
   * closets aren't a real product. */
  function setKind(kind) {
    setConfig(withClone(config, (d) => {
      d.kind = kind;
      for (const door of d.doors ?? []) door.kind = kind;
      // Track rails only make sense for sliding closets; turn them
      // off automatically when switching to hinged.
      if (kind !== "sliding") d.hasTrackRails = false;
    }));
  }
  const kind = config.kind ?? config.doors?.[0]?.kind ?? "hinged";
  return (
    <div className="closet-builder__group">
      <h4 className="closet-builder__group-title">בסיס</h4>
      <TextField
        label="שם המודל"
        value={config.name}
        onChange={(v) => setConfig(withClone(config, (d) => { d.name = v; }))}
      />
      <NumberField
        label="מחיר בסיס (₪)"
        value={config.basePrice}
        min={0}
        step={50}
        onChange={(v) => setConfig(withClone(config, (d) => { d.basePrice = v; }))}
      />
      <div className="field field--small">
        <span>סוג ארון</span>
        <div className="closet-builder__door-vis" role="radiogroup" aria-label="סוג ארון">
          {[{ value: "hinged", label: "צירים" }, { value: "sliding", label: "הזזה" }].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={kind === value}
              className={"closet-builder__door-vis-btn" + (kind === value ? " closet-builder__door-vis-btn--active" : "")}
              onClick={() => setKind(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <ToggleField
        label="הוסף במה (רגליים תחתונות)"
        checked={config.hasBase ?? false}
        onChange={(v) => setConfig(withClone(config, (d) => { d.hasBase = v; }))}
      />
    </div>
  );
}

/* v1.56.0 — per-template dimension constraints. Admin sets the
 * min / max / step / default that customers see in the designer's
 * step-1 sliders. Three rows: height, width (total cabinet), depth.
 *
 * Width here is the TOTAL cabinet width. The designer translates
 * back to compartmentWidth (= total / doors.length) under the hood. */
const CONSTRAINT_ROWS = [
  { dim: "height", label: "גובה" },
  { dim: "width",  label: "רוחב כולל" },
  { dim: "depth",  label: "עומק" },
];

export function ConstraintsEditor({ config, setConfig }) {
  const [openDim, setOpenDim] = useState(null);
  const c = config.constraints ?? { height: {}, width: {}, depth: {} };

  function setVal(dim, key, v) {
    setConfig(withClone(config, (d) => {
      d.constraints = d.constraints ?? { height: {}, width: {}, depth: {} };
      d.constraints[dim] = d.constraints[dim] ?? {};
      d.constraints[dim][key] = v;
    }));
  }

  return (
    <div className="closet-builder__group">
      <h4 className="closet-builder__group-title">אילוצי מימדים ללקוח (ס״מ)</h4>
      <div className="constraint-accordion">
        {CONSTRAINT_ROWS.map((row) => {
          const isOpen = openDim === row.dim;
          const dim = c[row.dim] ?? {};
          return (
            <div key={row.dim} className={"constraint-item" + (isOpen ? " constraint-item--open" : "")}>
              <button
                type="button"
                className="constraint-item__header"
                onClick={() => setOpenDim(isOpen ? null : row.dim)}
              >
                <span className="constraint-item__label">{row.label}</span>
                <span className="constraint-item__summary">
                  {dim.min ?? "—"} – {dim.max ?? "—"} ס״מ
                  {dim.default != null ? ` (ברירת מחדל: ${dim.default})` : ""}
                </span>
                <span className="constraint-item__chevron">{isOpen ? "▲" : "▼"}</span>
              </button>
              {isOpen && (
                <div className="constraint-item__body">
                  <NumberField label="מינ׳" value={dim.min ?? 0} min={0} step={5}
                    onChange={(v) => setVal(row.dim, "min", v)} />
                  <NumberField label="מקס׳" value={dim.max ?? 0} min={0} step={5}
                    onChange={(v) => setVal(row.dim, "max", v)} />
                  <NumberField label="צעד" value={dim.step ?? 1} min={1} step={1}
                    onChange={(v) => setVal(row.dim, "step", v)} />
                  <NumberField label="ברירת מחדל" value={dim.default ?? 0} min={0} step={5}
                    onChange={(v) => setVal(row.dim, "default", v)} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DimensionsEditor({ config, setConfig }) {
  const dim = config.dimensions;
  const nDoors = Math.max(1, config.doors?.length ?? 1);
  // v1.58.0 — admin edits TOTAL width (= compartmentWidth × doors).
  // Per-compartment width is derived back from total / doors. Matches
  // how the customer-side designer (DevClosetDesigner) presents
  // "רוחב כללי" — one source of truth for the user.
  const totalW = dim.compartmentWidth * nDoors;
  function set(key, v) {
    setConfig(withClone(config, (d) => { d.dimensions[key] = v; }));
  }
  function setTotalWidth(v) {
    set("compartmentWidth", Math.max(1, Math.round(v / nDoors)));
  }
  return (
    <div className="closet-builder__group">
      <h4 className="closet-builder__group-title">מידות (ס״מ)</h4>
      <div className="closet-builder__row">
        <NumberField label="רוחב"    value={totalW} min={nDoors * 30} max={nDoors * 250} step={10} onChange={setTotalWidth} />
        <NumberField label="גובה"    value={dim.H} min={150} max={600} step={10} onChange={(v) => set("H", v)} />
        <NumberField label="עומק"    value={dim.D} min={30}  max={120} step={1}  onChange={(v) => set("D", v)} />
        <NumberField label="עובי לוח" value={dim.T} min={1.5} max={3}   step={0.5} onChange={(v) => set("T", v)} />
      </div>
      <div className="muted small">
        מתחלק ל-{nDoors} מדורים × {dim.compartmentWidth} ס״מ
      </div>
    </div>
  );
}

export function AppearanceEditor({ config, setConfig }) {
  return (
    <div className="closet-builder__group">
      <h4 className="closet-builder__group-title">מראה</h4>
      <div className="closet-builder__label">צבע</div>
      <ColorPicker
        value={config.color}
        onChange={(id) =>
          setConfig(withClone(config, (d) => { d.color = id; }))
        }
      />
      <ToggleField
        label="פסי הזזה (עליון + תחתון) — מציג לדלתות הזזה"
        checked={!!config.hasTrackRails}
        onChange={(v) => setConfig(withClone(config, (d) => { d.hasTrackRails = v; }))}
      />
      {/* v2.x — the closet-wide divider toggle was replaced by a
          per-cabin דופן choice in each door card (DoorsSection). */}
      {/* v1.69.0 — admin sets the template's default handle. Each
          door inherits this value unless its own `door.handleColor`
          is set (no per-door override in the admin yet — customer
          designer can pick per-door in step 3).
          v1.84.0 — handle list comes from the admin-managed catalog
          and filters by the closet's `kind` so a sliding-only
          handle doesn't surface in a hinged closet's picker. */}
      <div className="closet-builder__label">ידיות</div>
      <HandlePicker
        closetKind={config.kind}
        value={config.handleColor ?? DEFAULT_HANDLE}
        onChange={(id) =>
          setConfig(withClone(config, (d) => { d.handleColor = id; }))
        }
      />
    </div>
  );
}

/* Swatch row for the available handle options. Each swatch is a
 * stubby vertical bar in the option's color, with the Hebrew name
 * below. Picked option gets a colored ring like ColorPicker.
 * v1.84.0 — pulls the catalog from useHandles() and filters by
 * the cabinet's door kind. */
function HandlePicker({ closetKind, value, onChange }) {
  const { list } = useHandles();
  const available = handlesForDoorKind(list, closetKind);
  return (
    <div className="closet-builder__handle-picker">
      {available.map((h) => {
        const isActive = h.handle_key === value;
        return (
          <button
            type="button"
            key={h.handle_key}
            className={
              "closet-builder__handle-swatch" +
              (isActive ? " closet-builder__handle-swatch--active" : "")
            }
            onClick={() => onChange(h.handle_key)}
            aria-pressed={isActive}
            title={h.name}
          >
            <span
              className="closet-builder__handle-bar"
              style={{ background: h.color }}
            />
            <span className="closet-builder__handle-name">{h.name}</span>
          </button>
        );
      })}
    </div>
  );
}

const ADDON_EFFECTS = [
  { value: "aluminumOnShelves",        label: "אלומיניום על מדפים" },
  { value: "aluminumPerimeterOnSides", label: "אלומיניום בהיקף הצדדים" },
];

export function AddOnsEditor({ config, setConfig }) {
  function addAddOn() {
    setConfig(withClone(config, (d) => {
      d.addOns = d.addOns ?? [];
      d.addOns.push({
        id: `addon-${d.addOns.length + 1}`,
        label: "תוספת חדשה",
        price: 100,
        effect: ADDON_EFFECTS[0].value,
      });
    }));
  }
  function update(i, fn) {
    setConfig(withClone(config, (d) => fn(d.addOns[i])));
  }
  function remove(i) {
    setConfig(withClone(config, (d) => { d.addOns.splice(i, 1); }));
  }
  const addOns = config.addOns ?? [];
  return (
    <div className="closet-builder__group">
      <h4 className="closet-builder__group-title">תוספות</h4>
      {addOns.length === 0 && <div className="muted small">אין תוספות.</div>}
      {addOns.map((a, i) => (
        <div key={i} className="closet-builder__row">
          <TextField
            label="תווית"
            value={a.label}
            onChange={(v) => update(i, (x) => { x.label = v; })}
          />
          <NumberField
            label="מחיר (₪)"
            value={a.price}
            min={0}
            step={10}
            onChange={(v) => update(i, (x) => { x.price = v; })}
          />
          <div className="field field--small">
            <span>אפקט</span>
            <div className="closet-builder__door-vis" role="radiogroup" aria-label="אפקט">
              {ADDON_EFFECTS.map((ef) => (
                <button
                  key={ef.value}
                  type="button"
                  role="radio"
                  aria-checked={a.effect === ef.value}
                  className={"closet-builder__door-vis-btn" + (a.effect === ef.value ? " closet-builder__door-vis-btn--active" : "")}
                  onClick={() => update(i, (x) => { x.effect = ef.value; })}
                >{ef.label}</button>
              ))}
            </div>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => remove(i)} title="הסר תוספת">
            <Trash />
          </button>
        </div>
      ))}
      <button type="button" className="btn btn--ghost btn--sm" onClick={addAddOn}>
        <Plus /> הוסף תוספת
      </button>
    </div>
  );
}
