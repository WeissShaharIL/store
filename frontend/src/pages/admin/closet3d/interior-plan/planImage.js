/**
 * Render the stage-2 interior layout (the cabin configuration the customer
 * built — shelves / rods / drawers + cm measurements) to a PNG dataURL, so it
 * can be bundled into the "download photos" zip.
 *
 * We build a self-contained SVG string and rasterize it via an <img> + canvas.
 * The SVG references no external assets, so the canvas isn't tainted and
 * toDataURL() works. Hebrew labels render with the system font (web fonts
 * aren't available to an isolated SVG image — acceptable for a spec sheet).
 */

const ITEM_VISUALS = {
  shelf: { label: "מדף", color: "#8b6f47" },
  rod: { label: "מוט תליה", color: "#9a9a9f" },
  drawer: { label: "מגירה", color: "#6f7787" },
};

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export function buildInteriorPlanSvg(config, items) {
  const dims = config.dimensions ?? {};
  const doors = config.doors ?? [];
  const nDoors = Math.max(1, doors.length);
  const hasDivider = !!config.hasInternalDivider;
  const compartmentCount = hasDivider ? nDoors : 1;
  const heightCm = dims.H ?? 240;
  const compW = dims.compartmentWidth ?? 80;
  const widthCm = compW * nDoors;
  const T = dims.T ?? 2;

  const W = 900;
  const H = 640;
  const PAD_TOP = 64;
  const PAD_BOTTOM = 60;
  const PAD_X = 70;
  const drawW = W - PAD_X * 2;
  const drawH = H - PAD_TOP - PAD_BOTTOM;

  // Fit the cabinet rectangle into the draw area, preserving aspect ratio.
  const aspect = widthCm / heightCm;
  let cabW = drawH * aspect;
  let cabH = drawH;
  if (cabW > drawW) {
    cabW = drawW;
    cabH = drawW / aspect;
  }
  const left = PAD_X + (drawW - cabW) / 2;
  const top = PAD_TOP + (drawH - cabH) / 2;
  const right = left + cabW;
  const bottom = top + cabH;
  const cmPerPx = heightCm / cabH;
  const wallPx = Math.max(2, T / cmPerPx);
  const inL = left + wallPx;
  const inR = right - wallPx;
  const inT = top + wallPx;
  const inB = bottom - wallPx;
  const inW = inR - inL;
  const interiorHeightCm = Math.max(1, heightCm - 2 * T);

  const yToPx = (yNorm) => inB - yNorm * (inB - inT);

  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
  );
  parts.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
  parts.push(
    `<text x="${W / 2}" y="34" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#1d1d1f">תצורת פנים הארון</text>`,
  );

  // Cabinet body + interior.
  parts.push(
    `<rect x="${left}" y="${top}" width="${cabW}" height="${cabH}" fill="#ffffff" stroke="#94959a" stroke-width="2.5" rx="4"/>`,
  );
  parts.push(
    `<rect x="${inL}" y="${inT}" width="${inW}" height="${inB - inT}" fill="rgba(0,0,0,0.025)"/>`,
  );

  // Dividers between compartments.
  for (let i = 1; i < nDoors; i++) {
    const x = inL + (inW / nDoors) * i;
    if (hasDivider) {
      parts.push(
        `<rect x="${x - wallPx / 2}" y="${inT}" width="${wallPx}" height="${inB - inT}" fill="#ffffff" stroke="#94959a" stroke-width="1.5"/>`,
      );
    } else {
      parts.push(
        `<line x1="${x}" y1="${inT}" x2="${x}" y2="${inB}" stroke="rgba(0,0,0,0.12)" stroke-width="1" stroke-dasharray="3 5"/>`,
      );
    }
  }

  // Per-compartment: cabin label, items, gap measurements.
  for (let di = 0; di < (hasDivider ? nDoors : 1); di++) {
    const door = doors[di] ?? doors[0];
    const slice = hasDivider ? inW / nDoors : inW;
    const colLeft = hasDivider ? inL + di * slice : inL;
    const colCenter = colLeft + slice / 2;

    // Cabin label (תא N) — only when there's more than one compartment.
    if (compartmentCount > 1) {
      const pillW = 56;
      const pillH = 22;
      const cy = top - 30;
      parts.push(
        `<rect x="${colCenter - pillW / 2}" y="${cy - pillH / 2}" width="${pillW}" height="${pillH}" rx="${pillH / 2}" fill="#ffffff" stroke="#1d1d1f" stroke-width="1.5"/>`,
      );
      parts.push(
        `<text x="${colCenter}" y="${cy + 4}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#1d1d1f">תא ${di + 1}</text>`,
      );
    }

    const dItems = [...(items?.[door?.id] ?? [])].sort((a, b) => a.y - b.y);

    // Gap measurements (cm) between consecutive items.
    let prevY = 0;
    const segs = [];
    for (const it of dItems) {
      segs.push({ lowY: prevY, highY: it.y });
      prevY = it.y;
    }
    segs.push({ lowY: prevY, highY: 1 });
    for (const seg of segs) {
      const cm = Math.round((seg.highY - seg.lowY) * interiorHeightCm);
      if (cm < 1) continue;
      const cyMid = (yToPx(seg.lowY) + yToPx(seg.highY)) / 2;
      const text = String(cm);
      const pw = Math.max(24, text.length * 8 + 8);
      parts.push(
        `<rect x="${colCenter - pw / 2}" y="${cyMid - 8}" width="${pw}" height="16" rx="8" fill="#eef0fa" stroke="rgba(0,0,0,0.1)" stroke-width="1"/>`,
      );
      parts.push(
        `<text x="${colCenter}" y="${cyMid + 4}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="600" fill="#3a3f55">${text}</text>`,
      );
    }

    // Item bars.
    for (const it of dItems) {
      const v = ITEM_VISUALS[it.type] ?? { label: it.type, color: "#888" };
      const cy = yToPx(it.y);
      const pad = 10;
      const bx = colLeft + pad;
      const bw = slice - pad * 2;
      parts.push(
        `<rect x="${bx}" y="${cy - 11}" width="${bw}" height="22" rx="4" fill="${v.color}" opacity="0.92"/>`,
      );
      parts.push(
        `<text x="${colCenter}" y="${cy + 4}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="600" fill="#ffffff">${esc(v.label)}</text>`,
      );
    }
  }

  // Overall dimension labels.
  parts.push(
    `<text x="${(left + right) / 2}" y="${bottom + 34}" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="600" fill="#444">רוחב ${Math.round(widthCm)} ס״מ</text>`,
  );
  parts.push(
    `<text x="${left - 22}" y="${(top + bottom) / 2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="600" fill="#444" transform="rotate(-90 ${left - 22} ${(top + bottom) / 2})">גובה ${Math.round(heightCm)} ס״מ</text>`,
  );

  parts.push(`</svg>`);
  return { svg: parts.join(""), width: W, height: H };
}

export async function renderInteriorPlanPng(config, items) {
  const { svg, width, height } = buildInteriorPlanSvg(config, items);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.width = width;
    img.height = height;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}
