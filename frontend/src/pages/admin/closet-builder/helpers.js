/**
 * Pure-JS helpers for the closet builder. No React, no DOM (except
 * the download/file-input helpers which touch the document).
 *
 * Extracted from DevClosetBuilder.jsx in v1.46.0 when that file
 * hit ~1200 lines.
 */

/* ─────────── Random utilities ─────────── */

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
export function rangeInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
export function chance(p) {
  return Math.random() < p;
}

/* ─────────── Immutable update ─────────── */

/* Mutate-by-cloning helper. Returns a new object after applying `fn`
 * to a draft copy. Keeps state updates immutable without dragging in
 * immer. Deep clone via JSON is fine — config is plain data. */
export function withClone(obj, fn) {
  const draft = JSON.parse(JSON.stringify(obj));
  fn(draft);
  return draft;
}

/* ─────────── Export / import (v1.40.0) ─────────── */

/* Export bundles get a tiny envelope:
 *   { schemaVersion, exportedAt, kind: "model" | "library", ... }
 * The schemaVersion is set to the current app release. Import
 * accepts any version (the renderer keeps backward-compat to older
 * configs); a future schema-incompat would gate here.
 */
export const EXPORT_SCHEMA_VERSION = "1.40.0";

export function safeFilename(name) {
  return (name || "model")
    .trim()
    .replace(/[\/\\?<>:*|"]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60) || "model";
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

/* ─────────── Image upload helpers (v1.52.0) ─────────── */

/* Resize a user-selected image before upload. Phone photos can be
 * 5-10 MB at 4000+ px — way more than needed for a 320 px gallery
 * tile. We downsize to a max dimension and re-encode as JPEG to
 * keep upload payloads small (typically <200 KB after this).
 *
 * Returns a new File suitable for FormData. The MIME / extension
 * always become image/jpeg since the backend validator's ALLOWED
 * set includes .jpeg. */
export async function resizeImageForUpload(
  file,
  { maxDimension = 1400, quality = 0.85 } = {},
) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  let { width, height } = img;
  if (width > maxDimension || height > maxDimension) {
    const scale = Math.min(maxDimension / width, maxDimension / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
  if (!blob) throw new Error("שגיאה בעיבוד התמונה");
  const base = (file.name || "image").replace(/\.[^.]+$/, "");
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}
