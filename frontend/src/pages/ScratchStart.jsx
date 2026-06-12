import { lazy, Suspense, useEffect, useState } from "react";
import { X } from "../components/Icons.jsx";
import { newConfig, newDoor, defaultConstraints } from "./admin/closet-builder/defaults.js";
import { getPublicCustomClosetConfig } from "../api.js";
import "../styles/showroom/06-scratch.css";

const ClosetDesigner = lazy(() => import("./ClosetDesigner.jsx"));

const ALL_KIND_OPTIONS = [
  { id: "hinged",  label: "דלתות פתיחה", hint: "דלתות על צירים" },
  { id: "sliding", label: "דלתות הזזה",  hint: "דלתות על מסילה" },
];

const DEFAULT_CCFG = {
  minDoors: 1, maxDoors: 6,
  compartmentWidth: { min: 40, max: 120, step: 5, default: 80 },
  height:           { min: 150, max: 280, step: 5, default: 220 },
  depth:            { min: 40,  max: 80,  step: 5, default: 60  },
  allowHinged: true, allowSliding: true,
};

/**
 * "design from scratch" entry flow.
 * Loads constraints from the admin config; falls back to safe defaults.
 */
export default function ScratchStart({ onClose }) {
  const [ccfg, setCcfg] = useState(DEFAULT_CCFG);
  const [kind, setKind] = useState("hinged");
  const [doorCount, setDoorCount] = useState(2);
  const [item, setItem] = useState(null);

  useEffect(() => {
    getPublicCustomClosetConfig()
      .then((data) => {
        const merged = { ...DEFAULT_CCFG, ...data };
        setCcfg(merged);
        setDoorCount((c) => Math.min(Math.max(c, merged.minDoors), merged.maxDoors));
        setKind((k) => {
          if (k === "hinged"  && !merged.allowHinged)  return merged.allowSliding ? "sliding" : k;
          if (k === "sliding" && !merged.allowSliding) return merged.allowHinged  ? "hinged"  : k;
          return k;
        });
      })
      .catch(() => {});
  }, []);

  const kindOptions = ALL_KIND_OPTIONS.filter(
    (o) => (o.id === "hinged" ? ccfg.allowHinged !== false : ccfg.allowSliding !== false)
  );

  const doorOptions = Array.from(
    { length: Math.max(1, ccfg.maxDoors - ccfg.minDoors + 1) },
    (_, i) => ccfg.minDoors + i
  );

  function start() {
    const base = newConfig();
    const constraints = defaultConstraints();
    const cw = ccfg.compartmentWidth ?? DEFAULT_CCFG.compartmentWidth;
    const h  = ccfg.height           ?? DEFAULT_CCFG.height;
    const d  = ccfg.depth            ?? DEFAULT_CCFG.depth;

    const config = {
      ...base,
      name: "ארון בהתאמה אישית",
      basePrice: 0,
      kind,
      constraints: {
        ...constraints,
        width:  { min: cw.min * doorCount, max: cw.max * doorCount, step: cw.step, default: cw.default * doorCount },
        height: { min: h.min, max: h.max, step: h.step, default: h.default },
        depth:  { min: d.min, max: d.max, step: d.step, default: d.default },
      },
      dimensions: {
        ...base.dimensions,
        compartmentWidth: cw.default,
        H: h.default,
        D: d.default,
      },
      hasInternalDivider: doorCount > 1,
      doors: Array.from({ length: doorCount }, (_, i) => {
        const door = newDoor(i, kind);
        door.compartment = {
          defaultVariant: "default",
          variants: [{ id: "default", label: "ברירת מחדל", items: [] }],
        };
        return door;
      }),
    };

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
      <Suspense
        fallback={
          <div className="designer-loading" role="status" aria-label="טוען…">
            <div className="designer-loading__spinner" />
          </div>
        }
      >
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

        {kindOptions.length > 1 && (
          <div className="scratch-start__group">
            <h3 className="scratch-start__group-title">סוג דלתות</h3>
            <div className="scratch-start__options">
              {kindOptions.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={"scratch-start__option" + (kind === o.id ? " scratch-start__option--active" : "")}
                  onClick={() => { if (o.id === "sliding" && doorCount < 2) setDoorCount(2); setKind(o.id); }}
                >
                  <span className="scratch-start__option-label">{o.label}</span>
                  <span className="scratch-start__option-hint">{o.hint}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="scratch-start__group">
          <h3 className="scratch-start__group-title">מספר דלתות</h3>
          <div className="scratch-start__options scratch-start__options--doors">
            {doorOptions.map((n) => (
              <button
                key={n}
                type="button"
                className={"scratch-start__door" + (doorCount === n ? " scratch-start__door--active" : "") + (n === 1 && kind === "sliding" ? " scratch-start__door--disabled" : "")}
                disabled={n === 1 && kind === "sliding"}
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
