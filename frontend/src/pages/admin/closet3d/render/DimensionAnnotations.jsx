import { useEffect, useMemo } from "react";
import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";
import {
  DIM_LINE_THICKNESS,
  DIM_LINE_OFFSET,
  DIM_CAP_LENGTH,
  DIM_COLOR,
} from "./constants.js";

/**
 * Exterior dimension callouts (width + height) rendered just outside the
 * cabinet silhouette. Lines are 3D mesh so they rotate with the cabinet.
 *
 * v0.88.0 — the figure labels are 2D-canvas textures on camera-facing
 * sprites, NOT drei <Text> and NOT DOM <Html>. Why:
 *   - <Html> overlays can't be captured by gl.toDataURL(), so downloaded
 *     product photos showed bars with no numbers.
 *   - drei <Text> (troika) spins up a web worker from a blob: URL, which the
 *     site CSP (script-src 'self' 'wasm-unsafe-eval') blocks → the whole 3D
 *     scene crashed with a white screen.
 *   A CanvasTexture sprite is pure main-thread, renders INTO the WebGL buffer
 *   (so it appears in screenshots), needs no CSP change, and supports Hebrew
 *   ("ס״מ") natively via the 2D canvas fillText.
 */

// Build a CanvasTexture of `text` once. Returns { texture, aspect } so the
// sprite can be sized to keep the text from stretching.
function useLabelTexture(text) {
  return useMemo(() => {
    const pad = 24;
    const fontPx = 64;
    const measure = document.createElement("canvas").getContext("2d");
    measure.font = `600 ${fontPx}px Rubik, Arial, sans-serif`;
    const textW = Math.ceil(measure.measureText(text).width);

    const canvas = document.createElement("canvas");
    canvas.width = textW + pad * 2;
    canvas.height = fontPx + pad * 2;
    const ctx = canvas.getContext("2d");

    // Rounded translucent dark pill for contrast against any cabinet color.
    const r = 16;
    ctx.fillStyle = "rgba(13, 13, 15, 0.82)";
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(canvas.width, 0, canvas.width, canvas.height, r);
    ctx.arcTo(canvas.width, canvas.height, 0, canvas.height, r);
    ctx.arcTo(0, canvas.height, 0, 0, r);
    ctx.arcTo(0, 0, canvas.width, 0, r);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = `600 ${fontPx}px Rubik, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);

    const texture = new CanvasTexture(canvas);
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    return { texture, aspect: canvas.width / canvas.height };
  }, [text]);
}

function DimLabel({ text, position, height = 0.16 }) {
  const { texture, aspect } = useLabelTexture(text);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={position} scale={[height * aspect, height, 1]}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  );
}

export default function DimensionAnnotations({ W, H, D, cabinetY0 = 0 }) {
  const yBottom = cabinetY0;
  const yTop = cabinetY0 + H;

  const wZ = D / 2 + DIM_LINE_OFFSET;
  const wY = 0;

  const hX = -W / 2 - DIM_LINE_OFFSET;
  const hZ = D / 2;

  const widthLabel = `${Math.round(W * 100)} ס״מ`;
  const heightLabel = `${Math.round(H * 100)} ס״מ`;

  // Gentle size scaling so labels stay legible on small and large closets.
  const labelH = Math.min(0.22, Math.max(0.13, H * 0.08));

  return (
    <group>
      {/* ── Width dimension (bottom front) ───────────────────── */}
      <mesh position={[0, wY, wZ]}>
        <boxGeometry args={[W, DIM_LINE_THICKNESS, DIM_LINE_THICKNESS]} />
        <meshBasicMaterial color={DIM_COLOR} />
      </mesh>
      <mesh position={[-W / 2, wY, wZ]}>
        <boxGeometry args={[DIM_LINE_THICKNESS, DIM_CAP_LENGTH, DIM_LINE_THICKNESS]} />
        <meshBasicMaterial color={DIM_COLOR} />
      </mesh>
      <mesh position={[W / 2, wY, wZ]}>
        <boxGeometry args={[DIM_LINE_THICKNESS, DIM_CAP_LENGTH, DIM_LINE_THICKNESS]} />
        <meshBasicMaterial color={DIM_COLOR} />
      </mesh>
      <DimLabel text={widthLabel} position={[0, wY - 0.16, wZ]} height={labelH} />

      {/* ── Height dimension (left side) ─────────────────────── */}
      <mesh position={[hX, (yBottom + yTop) / 2, hZ]}>
        <boxGeometry args={[DIM_LINE_THICKNESS, H, DIM_LINE_THICKNESS]} />
        <meshBasicMaterial color={DIM_COLOR} />
      </mesh>
      <mesh position={[hX, yBottom, hZ]}>
        <boxGeometry args={[DIM_CAP_LENGTH, DIM_LINE_THICKNESS, DIM_LINE_THICKNESS]} />
        <meshBasicMaterial color={DIM_COLOR} />
      </mesh>
      <mesh position={[hX, yTop, hZ]}>
        <boxGeometry args={[DIM_CAP_LENGTH, DIM_LINE_THICKNESS, DIM_LINE_THICKNESS]} />
        <meshBasicMaterial color={DIM_COLOR} />
      </mesh>
      <DimLabel text={heightLabel} position={[hX - 0.18, (yBottom + yTop) / 2, hZ]} height={labelH} />
    </group>
  );
}
