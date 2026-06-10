import { useEffect, useRef, useState } from "react";
import { X, Eye, EyeOff, Download } from "../../components/Icons.jsx";
import { parseConfig } from "../../lib/parseConfig.js";
import { getPublicComponentPrices } from "../../api.js";
import { totalWidth } from "./closet3d/schema.js";
import ClosetScene from "./closet3d/ClosetScene.jsx";
import ClosetFromConfig from "./closet3d/ClosetFromConfig.jsx";
import { renderInteriorPlanPng } from "./closet3d/interior-plan/planImage.js";
import { dataUrlToU8, delay } from "../../lib/dataUrl.js";
import "./AdminLeadPreview.css";

/**
 * v0.79.0 — 3D preview of a closet a customer designed, shown to the admin
 * from a lead/order. Reconstructs the live config the way the designer does:
 * base template (config_json) + customer snapshot overrides.
 *
 * v0.80.0 — admin can open/close doors and download product photos. Lazy-loaded
 * so three.js only ships on demand.
 */

export default function LeadClosetPreview({ item, onClose }) {
  const captureRef = useRef(null);
  const [openDoorIds, setOpenDoorIds] = useState([]);
  const [openDrawerIds, setOpenDrawerIds] = useState([]);
  const [downloading, setDownloading] = useState(false);
  // Component catalog so customer-placed custom components (`c:<id>`
  // item types) resolve to renderable base types in the 3D preview,
  // matching exactly what the customer saw in the designer.
  const [components, setComponents] = useState([]);

  useEffect(() => {
    getPublicComponentPrices().then(setComponents).catch(() => {});
  }, []);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const base = parseConfig(item.config_json);
  const snap = item.snapshot || {};
  // Merge stage-2 interior placements into each door's compartment so the
  // admin sees the exact shelves/rods/drawers the customer added.
  const resolveType = (t) => {
    if (typeof t === "string" && t.startsWith("c:")) {
      const id = parseInt(t.slice(2), 10);
      return components.find((c) => c.id === id)?.item_type ?? null;
    }
    return t;
  };
  // From-scratch orders store per-2-door-unit dividers (customDividers) +
  // base (customBase). Reconstruct the same divider rule the designer used.
  const unitDividers = snap.customDividers;
  const mergedDoors = (base.doors ?? []).map((door, i) => {
    let divider = door.divider;
    if (unitDividers) {
      if (i === 0) divider = false;
      else if (i % 2 === 1) divider = unitDividers[i] ?? true;
      else divider = true;
    }
    const placed = snap.customItems?.[door.id];
    if (!placed) return { ...door, divider };
    // External drawers shorten the door + render below it (drawerStack);
    // pull them out of the interior items and count into drawerStack.
    const interior = placed.filter((it) => resolveType(it.type) !== "external_drawer");
    const extCount = placed.length - interior.length;
    return {
      ...door,
      divider,
      drawerStack: (door.drawerStack ?? 0) + extCount,
      compartment: {
        defaultVariant: "custom",
        variants: [{ id: "custom", label: "מותאם", items: interior }],
      },
    };
  });
  const config = {
    ...base,
    doors: mergedDoors,
    dimensions: { ...base.dimensions, ...(snap.customDims || {}) },
    color: snap.customColor ?? base.color,
    hasInternalDivider: snap.customDivider ?? base.hasInternalDivider,
    hasBase: snap.customBase ?? base.hasBase ?? false,
  };
  const doors = config.doors ?? [];
  const allOpen = doors.length > 0 && openDoorIds.length === doors.length;

  const state = {
    doorHandles: snap.customDoorHandles,
    doorMaterials: snap.customDoorMaterials,
    openDoorIds,
    openDrawerIds,
  };

  const hasConfig = Object.keys(base).length > 0 && doors.length > 0;

  const widthCm = hasConfig ? totalWidth(config) : 80;
  const Hm = (config.dimensions?.H ?? 240) / 100;
  const Wm = widthCm / 100;
  const Dm = (config.dimensions?.D ?? 56) / 100;
  const dist = Math.max(3.5, Math.max(Hm, Wm) * 2.0);
  const targetY = Hm / 2;
  // Default orbit (three-quarter) and a straight-on front camera position.
  const sceneCamera = [Wm * 0.2, targetY + Hm * 0.4, Dm / 2 + dist];
  const frontCamera = [0, targetY, Dm / 2 + dist];

  function toggleDoor(id) {
    setOpenDoorIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }
  function toggleDrawer(id) {
    setOpenDrawerIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }
  function toggleAllDoors() {
    setOpenDoorIds(allOpen ? [] : doors.map((d) => d.id));
  }

  // Download = front view (closed + open) + a 2D image of the customer's
  // stage-2 interior configuration — same set the customer gets, no 3/4 angle.
  // One ZIP (browsers block multiple rapid programmatic downloads).
  async function handleDownload() {
    if (!captureRef.current || downloading) return;
    setDownloading(true);
    const baseName = (item.name || "closet").replace(/\s+/g, "-");
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const shots = [];

      setOpenDoorIds([]);
      await delay(450); // let any closing animation settle
      if (captureRef.current) {
        shots.push([`${baseName}-חזית-סגור.png`, captureRef.current(frontCamera)]);
      }
      setOpenDoorIds(doors.map((d) => d.id));
      await delay(750); // hinged doors animate open
      if (captureRef.current) {
        shots.push([`${baseName}-חזית-פתוח.png`, captureRef.current(frontCamera)]);
      }

      for (const [fn, url] of shots) zip.file(fn, dataUrlToU8(url));

      // 2D interior configuration (shelves/rods/drawers + cm) from the snapshot.
      try {
        const planPng = await renderInteriorPlanPng(config, snap.customItems || {});
        zip.file(`${baseName}-תצורת-פנים.png`, dataUrlToU8(planPng));
      } catch {
        // A failed config image shouldn't block the photo download.
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${baseName}.zip`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="lead-preview__overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="lead-preview__card" onClick={(e) => e.stopPropagation()}>
        <div className="lead-preview__header">
          <h3 className="lead-preview__title">{item.name || "ארון"}</h3>
          <div className="lead-preview__header-actions">
            {hasConfig && (
              <>
                <button
                  type="button"
                  className="lead-preview__icon-btn"
                  onClick={toggleAllDoors}
                  title={allOpen ? "סגור דלתות" : "פתח דלתות"}
                  aria-label={allOpen ? "סגור דלתות" : "פתח דלתות"}
                >
                  {allOpen ? <EyeOff /> : <Eye />}
                </button>
                <button
                  type="button"
                  className="lead-preview__icon-btn"
                  onClick={handleDownload}
                  disabled={downloading}
                  title="הורד תמונות (חזית פתוח/סגור + תצורת פנים)"
                  aria-label="הורד תמונות"
                >
                  <Download />
                </button>
              </>
            )}
            <button type="button" className="lead-preview__close" onClick={onClose} aria-label="סגור" title="סגור (Esc)">
              <X />
            </button>
          </div>
        </div>
        <div className="lead-preview__scene">
          {hasConfig ? (
            <ClosetScene
              cameraPosition={sceneCamera}
              targetY={targetY}
              minDistance={3}
              maxDistance={25}
              hall
              captureRef={captureRef}
            >
              <ClosetFromConfig
                config={config}
                state={state}
                components={components}
                onSelectDoor={toggleDoor}
                onSelectDrawer={toggleDrawer}
                showDimensions
              />
            </ClosetScene>
          ) : (
            <p className="lead-preview__empty">אין נתוני תצורה להצגה בתלת-מימד.</p>
          )}
          {downloading && (
            <div className="lead-preview__capturing">מכין תמונות…</div>
          )}
        </div>
        <p className="lead-preview__hint">
          לחץ על דלת או מגירה לפתיחה/סגירה · גרור כדי לסובב · גלגלת לזום
        </p>
      </div>
    </div>
  );
}
