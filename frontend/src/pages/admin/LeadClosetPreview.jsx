import { useEffect, useRef, useState } from "react";
import { X, Eye, EyeOff, Download } from "../../components/Icons.jsx";
import { parseConfig } from "../../lib/parseConfig.js";
import { totalWidth } from "./closet3d/schema.js";
import ClosetScene from "./closet3d/ClosetScene.jsx";
import ClosetFromConfig from "./closet3d/ClosetFromConfig.jsx";
import "./AdminLeadPreview.css";

/**
 * v0.79.0 — 3D preview of a closet a customer designed, shown to the admin
 * from a lead/order. Reconstructs the live config the way the designer does:
 * base template (config_json) + customer snapshot overrides.
 *
 * v0.80.0 — admin can open/close doors and download a set of product photos
 * (front + 3/4, closed + open). Lazy-loaded so three.js only ships on demand.
 */
function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

function dataUrlToU8(dataUrl) {
  const bin = atob(dataUrl.split(",")[1]);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

export default function LeadClosetPreview({ item, onClose }) {
  const captureRef = useRef(null);
  const [openDoorIds, setOpenDoorIds] = useState([]);
  const [openDrawerIds, setOpenDrawerIds] = useState([]);
  const [downloading, setDownloading] = useState(false);

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
  const mergedDoors = (base.doors ?? []).map((door) => {
    const placed = snap.customItems?.[door.id];
    if (!placed) return door;
    return {
      ...door,
      compartment: {
        defaultVariant: "custom",
        variants: [{ id: "custom", label: "מותאם", items: placed }],
      },
    };
  });
  const config = {
    ...base,
    doors: mergedDoors,
    dimensions: { ...base.dimensions, ...(snap.customDims || {}) },
    color: snap.customColor ?? base.color,
    hasInternalDivider: snap.customDivider ?? base.hasInternalDivider,
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
  // 3/4 view: pull the camera back (×1.3) so a wide cabinet's side panel stays
  // in frame for the downloaded photo instead of being cropped.
  const threeQuarterCamera = [Wm * 0.5, targetY + Hm * 0.32, Dm / 2 + dist * 1.3];

  function toggleDoor(id) {
    setOpenDoorIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }
  function toggleDrawer(id) {
    setOpenDrawerIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }
  function toggleAllDoors() {
    setOpenDoorIds(allOpen ? [] : doors.map((d) => d.id));
  }

  // Capture all 4 views (closed/open × front/3-quarter) and bundle into ONE zip.
  // Browsers block multiple rapid programmatic a.click() downloads (only the
  // first lands) — that was the "only 1 picture downloads" bug.
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
        shots.push([`${baseName}-סגור-חזית.png`, captureRef.current(frontCamera)]);
        await delay(120);
        shots.push([`${baseName}-סגור-זווית.png`, captureRef.current(threeQuarterCamera)]);
      }
      setOpenDoorIds(doors.map((d) => d.id));
      await delay(750); // hinged doors animate open
      if (captureRef.current) {
        shots.push([`${baseName}-פתוח-חזית.png`, captureRef.current(frontCamera)]);
        await delay(120);
        shots.push([`${baseName}-פתוח-זווית.png`, captureRef.current(threeQuarterCamera)]);
      }

      for (const [fn, url] of shots) zip.file(fn, dataUrlToU8(url));
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
                  title="הורד תמונות (חזית, זווית, פתוח, סגור)"
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
              showDimToggle
              captureRef={captureRef}
            >
              <ClosetFromConfig
                config={config}
                state={state}
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
