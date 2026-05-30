import { useEffect } from "react";
import { X } from "../../components/Icons.jsx";
import { parseConfig } from "../../lib/parseConfig.js";
import { totalWidth } from "./closet3d/schema.js";
import ClosetScene from "./closet3d/ClosetScene.jsx";
import ClosetFromConfig from "./closet3d/ClosetFromConfig.jsx";
import "./AdminLeadPreview.css";

/**
 * v0.79.0 — 3D preview of a closet a customer designed, shown to the admin
 * from a lead. Reconstructs the live config exactly the way ClosetDesigner /
 * CartPage do: base template (config_json) + customer snapshot overrides.
 *
 * Lazy-loaded from LeadsTab so three.js only ships when the admin opens a
 * preview, never on the main admin bundle.
 */
export default function LeadClosetPreview({ item, onClose }) {
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
  const state = {
    doorHandles: snap.customDoorHandles,
    doorMaterials: snap.customDoorMaterials,
  };

  const hasConfig = Object.keys(base).length > 0 && (config.doors?.length ?? 0) > 0;

  const widthCm = hasConfig ? totalWidth(config) : 80;
  const Hm = (config.dimensions?.H ?? 240) / 100;
  const Wm = widthCm / 100;
  const Dm = (config.dimensions?.D ?? 56) / 100;
  const sceneCamera = [Wm * 0.2, Hm / 2 + Hm * 0.4, Dm / 2 + Math.max(3.5, Math.max(Hm, Wm) * 2.0)];
  const sceneTargetY = Hm / 2;

  return (
    <div className="lead-preview__overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="lead-preview__card" onClick={(e) => e.stopPropagation()}>
        <div className="lead-preview__header">
          <h3 className="lead-preview__title">{item.name || "ארון"}</h3>
          <button type="button" className="lead-preview__close" onClick={onClose} aria-label="סגור" title="סגור (Esc)">
            <X />
          </button>
        </div>
        <div className="lead-preview__scene">
          {hasConfig ? (
            <ClosetScene
              cameraPosition={sceneCamera}
              targetY={sceneTargetY}
              minDistance={3}
              maxDistance={25}
              hall
              showDimToggle
            >
              <ClosetFromConfig config={config} state={state} showDimensions />
            </ClosetScene>
          ) : (
            <p className="lead-preview__empty">אין נתוני תצורה להצגה בתלת-מימד.</p>
          )}
        </div>
        <p className="lead-preview__hint">גרור כדי לסובב · גלגלת לזום</p>
      </div>
    </div>
  );
}
