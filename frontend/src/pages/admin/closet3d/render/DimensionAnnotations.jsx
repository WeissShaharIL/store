import { Billboard, Text } from "@react-three/drei";
import {
  DIM_LINE_THICKNESS,
  DIM_LINE_OFFSET,
  DIM_CAP_LENGTH,
  DIM_COLOR,
} from "./constants.js";

/**
 * v1.48.0 — exterior dimension callouts (width + height) rendered
 * just outside the cabinet silhouette. The lines are 3D mesh, so
 * they sit in world space and rotate with the cabinet as the camera
 * orbits.
 *
 * v0.86.0 — the figure labels are now in-scene 3D <Text> (billboarded
 * to face the camera) instead of DOM <Html> overlays. The old <Html>
 * pills could not be captured by gl.toDataURL(), so downloaded product
 * photos showed bars with no measurements. 3D text renders into the
 * WebGL buffer, so it now appears in the downloaded images. The unit is
 * rendered as Latin "cm" because the default troika font has no Hebrew
 * glyphs; to show "ס״מ" instead, drop a Hebrew TTF/WOFF in
 * public/fonts/ and pass it via the Text `font` prop.
 */
export default function DimensionAnnotations({ W, H, D, cabinetY0 = 0 }) {
  const yBottom = cabinetY0;
  const yTop = cabinetY0 + H;

  const wZ = D / 2 + DIM_LINE_OFFSET;
  const wY = 0;

  const hX = -W / 2 - DIM_LINE_OFFSET;
  const hZ = D / 2;

  const widthLabel = `${Math.round(W * 100)} cm`;
  const heightLabel = `${Math.round(H * 100)} cm`;

  // Label size scales gently with the cabinet so it stays legible on
  // both small and large closets.
  const fontSize = Math.min(0.16, Math.max(0.09, H * 0.06));

  const label = (text, position) => (
    <Billboard position={position}>
      <Text
        fontSize={fontSize}
        color={DIM_COLOR}
        anchorX="center"
        anchorY="middle"
        outlineWidth={fontSize * 0.08}
        outlineColor="#0d0d0f"
        outlineOpacity={0.9}
      >
        {text}
      </Text>
    </Billboard>
  );

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
      {label(widthLabel, [0, wY - 0.14, wZ])}

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
      {label(heightLabel, [hX - 0.16, (yBottom + yTop) / 2, hZ])}
    </group>
  );
}
