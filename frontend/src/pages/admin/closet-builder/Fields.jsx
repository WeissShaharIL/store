/**
 * Generic field components used by the editor sections. Thin
 * wrappers around <input> with the project's labelling convention.
 *
 * Extracted from DevClosetBuilder.jsx in v1.46.0.
 *
 * v1.55.0 — `<ColorPicker>` added so the same swatch-row UI can
 * be reused by the admin builder, the read-only details overlay,
 * and the customer-style designer. The CSS lives under the legacy
 * `.sliding-colors*` selectors in development.css (rename is on
 * the backlog).
 */

import { useEffect, useState } from "react";
import { usePaletteColors } from "../PaletteContext.jsx";

/**
 * v1.99.21 — NumberField uses LOCAL input state, commits to the
 * parent on blur or Enter (not on every keystroke). This fixes
 * a class of "the number jumps to a weird value while I'm
 * typing" bugs that hit on fields where the parent transforms
 * the value before storing it.
 *
 * Example: admin builder, רוחב field:
 *   totalW = compartmentWidth * nDoors   (display)
 *   setTotalWidth(v) → compartmentWidth = Math.round(v / nDoors)
 *
 * With per-keystroke onChange, typing "300" would feed the parent
 * 3, then 30, then 300 — but each commit ALSO re-renders the
 * field with the recomputed totalW, which on multi-door cabinets
 * differs from the typed value. The input value drifts away from
 * the user's intent and can spiral. User report: "doesnt matter
 * what numbers i press inside the box the numbers appear 60000."
 *
 * Local state isolates the input from the parent's transform
 * until the user signals "I'm done" via blur or Enter. At commit
 * time we also clamp to min/max so HTML5's loose validation
 * can't leak out-of-range values through.
 */
export function NumberField({ label, value, onChange, min, max, step = 1 }) {
  const [draft, setDraft] = useState(() => String(value ?? ""));

  // External sync: if the parent's value changes for reasons
  // other than this field's commit (e.g., "הפתע אותי"
  // randomized the config, or a sibling field's commit
  // recomputed this one), pull the new value into the draft.
  useEffect(() => {
    setDraft(String(value ?? ""));
  }, [value]);

  function commit() {
    const n = Number(draft);
    if (!Number.isFinite(n)) {
      setDraft(String(value ?? ""));
      return;
    }
    const clamped = Math.min(
      max ?? Number.POSITIVE_INFINITY,
      Math.max(min ?? Number.NEGATIVE_INFINITY, n),
    );
    if (clamped !== value) {
      onChange(clamped);
    } else {
      // Snap the draft to the canonical string so the input
      // doesn't show "300" when the parent already has 300.
      setDraft(String(clamped));
    }
  }

  return (
    <label className="field field--small">
      <span>{label}</span>
      <input
        type="number"
        value={draft}
        min={min}
        max={max}
        step={step}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
      />
    </label>
  );
}

export function TextField({ label, value, onChange, placeholder }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function ToggleField({ label, checked, onChange }) {
  return (
    <label className="dev-closet__toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

/* Swatch-button row for picking a palette color. v1.75.0 — palette
 * is now admin-managed (loaded via PaletteContext); falls back to
 * DEFAULT_COLORS while the API list is loading. Iteration order
 * matches the `sort_order` the admin set in the "פלטת צבעים"
 * editor; `value` is the active color ID and the button for that
 * ID gets the active style. */
export function ColorPicker({ value, onChange }) {
  const { colors } = usePaletteColors();
  return (
    <div className="sliding-colors">
      {Object.keys(colors).map((id) => {
        const c = colors[id];
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            className={
              "sliding-colors__btn" +
              (active ? " sliding-colors__btn--active" : "")
            }
            onClick={() => onChange(id)}
            title={c.name}
            aria-pressed={active}
          >
            <span
              className="sliding-colors__swatch"
              style={{ background: c.swatch }}
            />
            <span>{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}
