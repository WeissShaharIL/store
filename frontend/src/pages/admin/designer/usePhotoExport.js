import { useState } from "react";
import { renderInteriorPlanPng } from "../closet3d/interior-plan/planImage.js";
import { dataUrlToU8, delay } from "../../../lib/dataUrl.js";

/**
 * Photo export for the closet designer's final step. Extracted from
 * ClosetDesigner.jsx (v2.x) — behaviour unchanged.
 *
 * Bundles a closed front shot + an open front shot + the 2D interior-plan
 * image into a single ZIP (browsers block multiple rapid downloads).
 *
 * @param {Object}   p
 * @param {Object}   p.captureRef        ref whose .current(cameraPos) → dataURL
 * @param {string}   p.name              base file name (e.g. the model name)
 * @param {Object}   p.dims              { Hm, Wm, Dm, targetY } in world units
 * @param {boolean}  p.hasSliding        sliding closets hide doors instead of opening
 * @param {Array}    p.doorList          config.doors (for open-all)
 * @param {Object}   p.customConfig      live config for the interior-plan png
 * @param {Object}   p.customItems       stage-2 placements for the interior-plan png
 * @param {Function} p.setOpenDoorIds
 * @param {Function} p.setSlidingDoorsHidden
 */
export function usePhotoExport({
  captureRef,
  name,
  dims,
  hasSliding,
  doorList,
  customConfig,
  customItems,
  setOpenDoorIds,
  setSlidingDoorsHidden,
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadPhotos() {
    if (!captureRef.current || downloading) return;
    setDownloading(true);
    const baseName = (name || "ארון").replace(/\s+/g, "-");
    const dist = Math.max(3.5, Math.max(dims.Hm, dims.Wm) * 2.0);
    const front = [0, dims.targetY, dims.Dm / 2 + dist];
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const shots = [];

      // Closed shot
      setOpenDoorIds([]);
      setSlidingDoorsHidden(false);
      await delay(450);
      if (captureRef.current) {
        shots.push([`${baseName}-חזית-סגור.png`, captureRef.current(front)]);
      }
      // "Open" shot — sliding closets: hide doors entirely; hinged: open them
      if (hasSliding) {
        setSlidingDoorsHidden(true);
      } else {
        setOpenDoorIds(doorList.map((d) => d.id));
      }
      await delay(750);
      if (captureRef.current) {
        shots.push([`${baseName}-חזית-פתוח.png`, captureRef.current(front)]);
      }
      // Restore state
      setOpenDoorIds([]);
      setSlidingDoorsHidden(false);

      for (const [fn, url] of shots) zip.file(fn, dataUrlToU8(url));

      // The 2D interior configuration from stage 2 (shelves/rods/drawers + cm).
      try {
        const planPng = await renderInteriorPlanPng(customConfig, customItems);
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

  return { downloading, handleDownloadPhotos };
}
