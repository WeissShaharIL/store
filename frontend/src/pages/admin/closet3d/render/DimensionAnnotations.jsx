import { Html } from "@react-three/drei";
import {
  DIM_LINE_THICKNESS,
  DIM_LINE_OFFSET,
  DIM_CAP_LENGTH,
  DIM_COLOR,
} from "./constants.js";

/**
 * v1.48.0 — exterior dimension callouts (width + height) rendered
 * just outside the cabinet silhouette. The lines are 3D mesh, so
 * they sit in world space and naturally rotate with the cabinet
 * as the camera orbits. Each line gets perpendicular end caps and
 * a floating HTML pill label so the figure stays screen-readable
 * from any angle.
 *
 * v1.79.0 — extracted from ClosetFromConfig.jsx.
 */
export default function DimensionAnnotations({ W, H, D, cabinetY0 = 0 }) {
  // Cabinet extents in world coordinates. The height annotation
  // spans from `cabinetY0` to `cabinetY0 + H`. v1.57.0: callers
  // pass cabinetY0=0 and H=totalH so the line covers the floor
  // through the cabinet top (legs + stage + body) — the customer
  // sees the cabinet's TOTAL height, which matches what they
  // configured.
  const yBottom = cabinetY0;
  const yTop = cabinetY0 + H;

  // Width line: in front of cabinet, at floor level. The line itself
  // is a flat box; the caps are perpendicular bars at each end.
  const wZ = D / 2 + DIM_LINE_OFFSET;
  const wY = 0;

  // Height line: to the left of cabinet, on the front face plane.
  const hX = -W / 2 - DIM_LINE_OFFSET;
  const hZ = D / 2;

  // Label text. Width is total cabinet width (compartmentWidth × N);
  // height is the cabinet body height. Both stored in cm in the
  // schema, so just round and append the unit.
  const widthLabel = `${Math.round(W * 100)} ס״מ`;
  const heightLabel = `${Math.round(H * 100)} ס״מ`;

  return (
    <group>
      {/* ── Width dimension (bottom front) ───────────────────── */}
      <mesh position={[0, wY, wZ]}>
        <boxGeometry args={[W, DIM_LINE_THICKNESS, DIM_LINE_THICKNESS]} />
        <meshBasicMaterial color={DIM_COLOR} />
      </mesh>
      {/* Left cap (vertical bar at -W/2) */}
      <mesh position={[-W / 2, wY, wZ]}>
        <boxGeometry args={[DIM_LINE_THICKNESS, DIM_CAP_LENGTH, DIM_LINE_THICKNESS]} />
        <meshBasicMaterial color={DIM_COLOR} />
      </mesh>
      {/* Right cap */}
      <mesh position={[W / 2, wY, wZ]}>
        <boxGeometry args={[DIM_LINE_THICKNESS, DIM_CAP_LENGTH, DIM_LINE_THICKNESS]} />
        <meshBasicMaterial color={DIM_COLOR} />
      </mesh>
      <Html
        position={[0, wY - 0.05, wZ]}
        center
        style={{ pointerEvents: "none" }}
        zIndexRange={[10, 0]}
      >
        <div className="dim-label">{widthLabel}</div>
      </Html>

      {/* ── Height dimension (left side) ─────────────────────── */}
      <mesh position={[hX, (yBottom + yTop) / 2, hZ]}>
        <boxGeometry args={[DIM_LINE_THICKNESS, H, DIM_LINE_THICKNESS]} />
        <meshBasicMaterial color={DIM_COLOR} />
      </mesh>
      {/* Bottom cap (horizontal bar at floor) */}
      <mesh position={[hX, yBottom, hZ]}>
        <boxGeometry args={[DIM_CAP_LENGTH, DIM_LINE_THICKNESS, DIM_LINE_THICKNESS]} />
        <meshBasicMaterial color={DIM_COLOR} />
      </mesh>
      {/* Top cap */}
      <mesh position={[hX, yTop, hZ]}>
        <boxGeometry args={[DIM_CAP_LENGTH, DIM_LINE_THICKNESS, DIM_LINE_THICKNESS]} />
        <meshBasicMaterial color={DIM_COLOR} />
      </mesh>
      <Html
        position={[hX - 0.1, (yBottom + yTop) / 2, hZ]}
        center
        style={{ pointerEvents: "none" }}
        zIndexRange={[10, 0]}
      >
        <div className="dim-label">{heightLabel}</div>
      </Html>
    </group>
  );
}
