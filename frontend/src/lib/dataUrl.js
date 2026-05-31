/**
 * Shared helpers for the closet photo/zip download flows.
 *
 * `dataUrlToU8` + `delay` were duplicated verbatim in ClosetDesigner.jsx
 * (customer) and admin/LeadClosetPreview.jsx; extracted here so both share one
 * copy.
 */

/** Decode a `data:...;base64,...` URL into the raw bytes (for zipping). */
export function dataUrlToU8(dataUrl) {
  const bin = atob(dataUrl.split(",")[1]);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

/** Promise-based delay — lets door open/close animations settle before a
 * frame capture. */
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
