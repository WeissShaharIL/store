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

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
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
  const config = {
    ...base,
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
  const threeQuarterCamera = [Wm * 0.55, targetY + Hm * 0.35, Dm / 2 + dist * 0.92];

  function toggleDoor(id) {
    setOpenDoorIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }
  function toggleDrawer(id) {
    setOpenDrawerIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }
  function toggleAllDoors() {
    setOpenDoorIds(allOpen ? [] : doors.map((d) => d.id));
  }

  async function handleDownload() {
    if (!captureRef.current || downloading) return;
    setDownloading(true);
    const baseName = (item.name || "closet").replace(/\s+/g, "-");
    try {
      // 1+2: closed — front, then three-quarter
      setOpenDoorIds([]);
      await delay(450); // let any closing animation settle
      if (captureRef.current) {
        downloadDataUrl(captureRef.current(frontCamera), `${baseName}-סגור-חזית.png`);
        await delay(150);
        downloadDataUrl(captureRef.current(threeQuarterCamera), `${baseName}-סגור-זווית.png`);
        await delay(150);
      }
      // 3+4: open — front, then three-quarter
      setOpenDoorIds(doors.map((d) => d.id));
      await delay(750); // hinged doors animate open
      if (captureRef.current) {
        downloadDataUrl(captureRef.current(frontCamera), `${baseName}-פתוח-חזית.png`);
        await delay(150);
        downloadDataUrl(captureRef.current(threeQuarterCamera), `${baseName}-פתוח-זווית.png`);
      }
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
