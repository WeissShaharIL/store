import { lazy, Suspense, useState } from "react";
import { X } from "../components/Icons.jsx";
import { newConfig, newDoor, defaultConstraints } from "./admin/closet-builder/defaults.js";
import "../styles/showroom/06-scratch.css";

const ClosetDesigner = lazy(() => import("./ClosetDesigner.jsx"));

const KIND_OPTIONS = [
  { id: "hinged", label: "דלתות פתיחה", hint: "דלתות על צירים" },
  { id: "sliding", label: "דלתות הזזה", hint: "דלתות על מסילה" },
];
const DOOR_OPTIONS = [1, 2, 3, 4, 5, 6];

/**
 * v0.74.0 — "design from scratch" entry flow (doron-home style).
 * Collects the two structural choices that the rest of the wizard
 * can't change mid-session — door kind and door count — then builds
 * a fresh ClosetConfig and hands off to the normal ClosetDesigner.
 */
export default function ScratchStart({ onClose }) {
  const [kind, setKind] = useState("hinged");
  const [doorCount, setDoorCount] = useState(2);
  const [item, setItem] = useState(null);

  function start() {
    const base = newConfig();
    const constraints = defaultConstraints();
    // Scale the width constraints to the chosen door count so the
    // dimensions step has a sensible range for the whole cabinet.
    const perDoorMin = 40, perDoorMax = 120, perDoorDefault = 80;
    const config = {
      ...base,
      name: "ארון בהתאמה אישית",
      basePrice: 0, // priced by estimatePrice() in the designer
      kind,
      constraints: {
        ...constraints,
        width: {
          min: perDoorMin * doorCount,
          max: perDoorMax * doorCount,
          step: 5,
          default: perDoorDefault * doorCount,
        },
      },
      dimensions: { ...base.dimensions, compartmentWidth: perDoorDefault },
      hasInternalDivider: doorCount > 1,
      // From-scratch closets start with EMPTY cabins — no default shelves or
      // hanging rod. The customer places interior items themselves in stage 2.
      // (newDoor's defaults stay intact for the admin/template flows.)
      doors: Array.from({ length: doorCount }, (_, i) => {
        const d = newDoor(i, kind);
        d.compartment = {
          defaultVariant: "default",
          variants: [{ id: "default", label: "ברירת מחדל", items: [] }],
        };
        return d;
      }),
    };
    // Unique id so the designer's localStorage draft key doesn't collide
    // with a template design.
    setItem({
      id: `scratch-${kind}-${doorCount}`,
      name: config.name,
      image_path: null,
      config_json: JSON.stringify(config),
      config,
    });
  }

  if (item) {
    return (
      <Suspense fallback={null}>
        <ClosetDesigner item={item} onClose={onClose} fromScratch />
      </Suspense>
    );
  }

  return (
    <div className="scratch-start__overlay" role="dialog" aria-modal="true" aria-label="עיצוב ארון מאפס">
      <div className="scratch-start__card">
        <button type="button" className="scratch-start__close" onClick={onClose} aria-label="סגור" title="סגור">
          <X />
        </button>
        <h2 className="scratch-start__title">בואו נעצב ארון משלכם</h2>
        <p className="scratch-start__sub">בחרו את סוג הדלתות וכמה דלתות, ונמשיך משם.</p>

        <div className="scratch-start__group">
          <h3 className="scratch-start__group-title">סוג דלתות</h3>
          <div className="scratch-start__options">
            {KIND_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                className={"scratch-start__option" + (kind === o.id ? " scratch-start__option--active" : "")}
                onClick={() => setKind(o.id)}
              >
                <span className="scratch-start__option-label">{o.label}</span>
                <span className="scratch-start__option-hint">{o.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="scratch-start__group">
          <h3 className="scratch-start__group-title">מספר דלתות</h3>
          <div className="scratch-start__options scratch-start__options--doors">
            {DOOR_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                className={"scratch-start__door" + (doorCount === n ? " scratch-start__door--active" : "")}
                onClick={() => setDoorCount(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="scratch-start__cta" onClick={start}>
          התחל לעצב
        </button>
      </div>
    </div>
  );
}
