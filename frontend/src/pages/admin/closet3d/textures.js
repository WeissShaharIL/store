/**
 * Procedural textures for the closet renderer.
 *
 * v1.59.0 — first entry: a wood-grain pattern used by the
 * `mevuka` palette entry. Generated once at first use (canvas
 * draw + per-pixel noise pass) and cached for the lifetime of
 * the page; every plank / door / shelf using this color shares
 * the same THREE.CanvasTexture instance.
 *
 * Why procedural instead of an image file: keeps the bundle
 * binary-asset-free, regenerable, and easy to retune (knob
 * counts, grain wave amplitudes, base tones). For higher-
 * fidelity needs later, swap to a real PBR texture set
 * (albedo + normal + roughness).
 */
import * as THREE from "three";

const TEXTURE_SIZE = 512;

const cache = new Map();

/* Internal: draws a wood-grain pattern onto a Canvas2D context
 * and returns a THREE.CanvasTexture. Tileable in both axes
 * (REPEAT wrap) — small visual seam at the boundary but
 * acceptable at the scales the closet planks render at. */
function buildWoodTexture({ base, dark, light, knotColor, knotCount = 6 }) {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext("2d");

  // 1. Base wood tone.
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  // 2. Many wavy near-vertical grain lines. Mixed dark and light
  //    lines, varying thickness + opacity, randomized to break up
  //    repetition.
  for (let i = 0; i < 140; i++) {
    const x = Math.random() * TEXTURE_SIZE;
    const thickness = 0.5 + Math.random() * 2.5;
    const opacity = 0.06 + Math.random() * 0.18;
    const isDark = Math.random() < 0.6;
    ctx.strokeStyle = isDark
      ? `rgba(${dark[0]}, ${dark[1]}, ${dark[2]}, ${opacity})`
      : `rgba(${light[0]}, ${light[1]}, ${light[2]}, ${opacity})`;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(x, -10);
    const phase = Math.random() * Math.PI * 2;
    for (let y = 0; y < TEXTURE_SIZE + 10; y += 6) {
      const wobble = Math.sin(y * 0.018 + phase) * 4 + (Math.random() - 0.5) * 2;
      ctx.lineTo(x + wobble, y);
    }
    ctx.stroke();
  }

  // 3. A handful of darker knots — radial gradients faded into
  //    transparency. Adds character; matches the "מבוקע" (split /
  //    cracked) product name.
  for (let i = 0; i < knotCount; i++) {
    const cx = Math.random() * TEXTURE_SIZE;
    const cy = Math.random() * TEXTURE_SIZE;
    const r = 4 + Math.random() * 10;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, `rgba(${knotColor[0]}, ${knotColor[1]}, ${knotColor[2]}, 0.55)`);
    grad.addColorStop(0.55, `rgba(${knotColor[0]}, ${knotColor[1]}, ${knotColor[2]}, 0.28)`);
    grad.addColorStop(1, `rgba(${knotColor[0]}, ${knotColor[1]}, ${knotColor[2]}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Fine per-pixel luminance noise so the surface doesn't read
  //    as cartoonishly flat between grain lines.
  const img = ctx.getImageData(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 12;
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  // Cabinet planks span ~1.5–2.5 m on their long axis. A 2×3
  // repeat on a 512 px source gives grain at a believable cm-
  // scale across the typical plank size without aggressive
  // tiling artifacts.
  tex.repeat.set(2, 3);
  tex.anisotropy = 4;
  return tex;
}

/* v1.99.11 — marble texture for palette entries that want a
 * polished-stone look. White base with grey veining + subtle
 * highlights. Same "grain mask" recipe as the wood textures
 * (white base + dark detail), so the multiplied palette `wood`
 * color tints the result. A palette using a stone-like wood
 * color (e.g., off-white #ebe8e1) produces classic white marble;
 * darker wood colors yield colored-marble variants. */
function buildMarbleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  // Major sweeping veins — long, smooth, diagonal.
  for (let i = 0; i < 12; i++) {
    ctx.strokeStyle = `rgba(110, 110, 115, ${0.18 + Math.random() * 0.18})`;
    ctx.lineWidth = 1 + Math.random() * 2.5;
    ctx.beginPath();
    const startX = Math.random() * TEXTURE_SIZE - 60;
    const startY = Math.random() * TEXTURE_SIZE - 60;
    const angle = (Math.random() - 0.5) * Math.PI * 0.9 + (i % 2 === 0 ? 0.5 : -0.5);
    const length = 360 + Math.random() * 500;
    const segs = 40;
    const wavePhase = Math.random() * Math.PI * 2;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const wob = Math.sin(t * 8 + wavePhase) * 14;
      const x = startX + Math.cos(angle) * length * t + Math.sin(wavePhase + t * 3) * wob;
      const y = startY + Math.sin(angle) * length * t + Math.cos(wavePhase + t * 4) * wob;
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Sub-veins — shorter, fainter, scattered.
  for (let i = 0; i < 60; i++) {
    ctx.strokeStyle = `rgba(150, 150, 155, ${0.08 + Math.random() * 0.14})`;
    ctx.lineWidth = 0.4 + Math.random() * 1.2;
    ctx.beginPath();
    const cx = Math.random() * TEXTURE_SIZE;
    const cy = Math.random() * TEXTURE_SIZE;
    const angle = Math.random() * Math.PI * 2;
    const length = 30 + Math.random() * 120;
    for (let s = 0; s <= 8; s++) {
      const t = s / 8;
      const x = cx + Math.cos(angle) * length * t + (Math.random() - 0.5) * 6;
      const y = cy + Math.sin(angle) * length * t + (Math.random() - 0.5) * 6;
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Soft glossy highlights.
  for (let i = 0; i < 18; i++) {
    const cx = Math.random() * TEXTURE_SIZE;
    const cy = Math.random() * TEXTURE_SIZE;
    const r = 20 + Math.random() * 55;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.30)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  _addLuminanceNoise(ctx, 4);
  return _finalizeTexture(canvas, 2, 2);
}

/* v1.99.11 — concrete: dense fine speckle + scattered larger
 * pits + faint patchy stains. Reads as raw or polished concrete
 * depending on the palette's wood color (mid-grey for raw,
 * lighter grey for polished). */
function buildConcreteTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  // Large faint stains — slightly darker patches that suggest
  // uneven cure / aging.
  for (let i = 0; i < 22; i++) {
    const cx = Math.random() * TEXTURE_SIZE;
    const cy = Math.random() * TEXTURE_SIZE;
    const r = 40 + Math.random() * 100;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, `rgba(140, 140, 140, ${0.10 + Math.random() * 0.08})`);
    grad.addColorStop(1, "rgba(140, 140, 140, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Small darker pits — pea-gravel artifacts.
  for (let i = 0; i < 220; i++) {
    const cx = Math.random() * TEXTURE_SIZE;
    const cy = Math.random() * TEXTURE_SIZE;
    const r = 0.5 + Math.random() * 1.8;
    ctx.fillStyle = `rgba(70, 70, 70, ${0.18 + Math.random() * 0.25})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Fine speckle — uniform across the surface. Heavier than the
  // wood/marble noise pass so concrete reads as overtly textured.
  _addLuminanceNoise(ctx, 16);
  return _finalizeTexture(canvas, 2, 2);
}

/* v1.99.11 — oak: same grain-line scaffold as the wood-mevuka
 * generator, but with tighter spacing + warmer dark tones +
 * fewer knots. Reads as a more uniform, "newer" wood than the
 * cracked-character mevuka. */
function buildOakTexture() {
  return buildWoodTexture({
    base: "#ffffff",
    dark: [110, 78, 44],
    light: [255, 248, 230],
    knotColor: [80, 50, 22],
    knotCount: 1,
  });
}

/* v1.99.11 — universal neutral grain. Returned by
 * getTextureForKey() when the palette entry has no specific
 * textureKey, so every surface in the renderer gets at least a
 * subtle live-material feel instead of reading as flat plastic.
 * Very low-amplitude noise (luminance ±4) and a few extremely
 * faint streaks — invisible at a glance, but eliminates the
 * cartoon-flat look the user reported. Repeated 4×6 so the
 * grain stays at a believable per-cm scale on long planks. */
function buildNeutralGrainTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  // A handful of barely-visible vertical streaks for "brushed"
  // micro-direction. Fainter than the wood-grain version.
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * TEXTURE_SIZE;
    ctx.strokeStyle = `rgba(120, 120, 120, ${0.025 + Math.random() * 0.04})`;
    ctx.lineWidth = 0.4 + Math.random() * 1.0;
    ctx.beginPath();
    ctx.moveTo(x, -10);
    const phase = Math.random() * Math.PI * 2;
    for (let y = 0; y < TEXTURE_SIZE + 10; y += 10) {
      const wobble = Math.sin(y * 0.012 + phase) * 2;
      ctx.lineTo(x + wobble, y);
    }
    ctx.stroke();
  }
  _addLuminanceNoise(ctx, 4);
  return _finalizeTexture(canvas, 4, 6);
}

/* Helpers shared by the texture generators. */
function _addLuminanceNoise(ctx, amplitude) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * amplitude;
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

function _finalizeTexture(canvas, repeatX, repeatY) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  return tex;
}

/* Public: resolve a palette entry's `textureKey` to a shared
 * texture instance.
 *
 * v1.99.11 — when key is null/empty/unknown, returns the
 * universal "neutral grain" texture (very subtle noise) instead
 * of null. Every surface in the renderer therefore gets at
 * least some live-material feel; nothing reads as cartoonishly
 * flat. The grain is a white-based mask so it multiplies cleanly
 * against the palette's `wood` color and doesn't shift the
 * underlying tone.
 */
const NEUTRAL_GRAIN_KEY = "__neutral_grain__";

export function getTextureForKey(key) {
  const lookup = key || NEUTRAL_GRAIN_KEY;
  if (cache.has(lookup)) return cache.get(lookup);
  let tex;
  if (lookup === "wood-mevuka") {
    // v1.62.2 — base switched to white so the material's `color`
    // prop (= palette wood color) provides the wood tone via
    // multiplication. Texture is now a "grain mask" — white
    // background + dark/light grain lines + sparse knots. With
    // color=#c4a373 (mevuka wood) it renders as light golden
    // brown with visible grain. Previously the base WAS the wood
    // color, which meant if the map ever failed to bind the
    // material fell back to color="#ffffff" and the cabinet
    // rendered white. This shape is robust to map failures.
    tex = buildWoodTexture({
      base: "#ffffff",
      dark: [80, 55, 30],
      light: [255, 245, 220],
      knotColor: [50, 30, 12],
      knotCount: 3,
    });
  } else if (lookup === "oak") {
    tex = buildOakTexture();
  } else if (lookup === "marble") {
    tex = buildMarbleTexture();
  } else if (lookup === "concrete") {
    tex = buildConcreteTexture();
  } else {
    // Unknown key or no key at all → neutral grain. Caches under
    // NEUTRAL_GRAIN_KEY, not under the original key, so a typo
    // doesn't pin one bad cache entry forever.
    tex = buildNeutralGrainTexture();
    cache.set(NEUTRAL_GRAIN_KEY, tex);
    return tex;
  }
  cache.set(lookup, tex);
  return tex;
}

/* Known texture keys for the admin picker dropdown. Maintained
 * alongside the if/else chain above — adding a new texture
 * means adding here AND adding a branch in getTextureForKey. */
export const TEXTURE_OPTIONS = [
  { key: "", label: "ללא טקסטורה (גרגיר עדין בלבד)" },
  { key: "wood-mevuka", label: "עץ מבוקע" },
  { key: "oak", label: "עץ אלון" },
  { key: "marble", label: "שיש" },
  { key: "concrete", label: "בטון" },
];

/* v1.61.0 — polished-marble floor texture. Different recipe from
 * the wood generator: bigger source canvas (1024), warm off-white
 * base, ~20 long sweeping diagonal veins drawn as smooth wavy
 * lines, ~80 shorter sub-veins for fine detail, scattered white
 * highlights to suggest a glossy surface, and gentle per-pixel
 * noise. Repeats 2×2 across the 20×16 m backdrop floor so the
 * pattern doesn't look obviously tiled. */
function buildMarbleFloorTexture() {
  const SIZE = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");

  // 1. Warm off-white base — same family as the whiteMarble palette.
  ctx.fillStyle = "#eae5dc";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // 2. Major veins: long, smooth, diagonal wavy lines.
  for (let i = 0; i < 22; i++) {
    ctx.strokeStyle = `rgba(120, 110, 100, ${0.14 + Math.random() * 0.2})`;
    ctx.lineWidth = 1.5 + Math.random() * 4;
    ctx.beginPath();
    const startX = Math.random() * SIZE - 100;
    const startY = Math.random() * SIZE - 100;
    const angle = (Math.random() - 0.5) * Math.PI * 0.8 + (i % 2 === 0 ? 0.5 : -0.5);
    const length = 700 + Math.random() * 900;
    const segs = 60;
    const wavePhase = Math.random() * Math.PI * 2;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const wob = Math.sin(t * 8 + wavePhase) * 25;
      const x = startX + Math.cos(angle) * length * t + Math.sin(wavePhase + t * 3) * wob;
      const y = startY + Math.sin(angle) * length * t + Math.cos(wavePhase + t * 4) * wob;
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // 3. Sub-veins: shorter scattered lines for fine character.
  for (let i = 0; i < 90; i++) {
    ctx.strokeStyle = `rgba(150, 140, 130, ${0.06 + Math.random() * 0.14})`;
    ctx.lineWidth = 0.4 + Math.random() * 1.6;
    ctx.beginPath();
    const cx = Math.random() * SIZE;
    const cy = Math.random() * SIZE;
    const angle = Math.random() * Math.PI * 2;
    const length = 50 + Math.random() * 220;
    const segs = 8;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const x = cx + Math.cos(angle) * length * t + (Math.random() - 0.5) * 8;
      const y = cy + Math.sin(angle) * length * t + (Math.random() - 0.5) * 8;
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // 4. Light highlights — soft radial gradients that fade out.
  //    Adds the "polished marble" glossy feel.
  for (let i = 0; i < 35; i++) {
    const cx = Math.random() * SIZE;
    const cy = Math.random() * SIZE;
    const r = 30 + Math.random() * 80;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, "rgba(255, 252, 246, 0.35)");
    grad.addColorStop(1, "rgba(255, 252, 246, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Subtle per-pixel noise so the surface isn't too clean.
  const img = ctx.getImageData(0, 0, SIZE, SIZE);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 6;
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = 8;
  return tex;
}

let marbleFloorTexture = null;
export function getMarbleFloorTexture() {
  if (!marbleFloorTexture) marbleFloorTexture = buildMarbleFloorTexture();
  return marbleFloorTexture;
}

// v1.64.0 added a warm-cream wallpaper texture for the backdrop wall.
// v1.67.0 removed the wall entirely, but the texture generator stayed
// "in case a future surface wants it back" — it didn't, after 16
// releases. v1.83.1 deleted as dead code. Check the v1.64.0 release
// for the original buildWallTexture / getWallTexture if anyone ever
// needs the wallpaper recipe back.
