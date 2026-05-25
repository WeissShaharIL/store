import { getMarbleFloorTexture } from "../textures.js";
import {
  BACKDROP_FLOOR_W,
  BACKDROP_FLOOR_D,
  BACKDROP_FLOOR_ROUGHNESS,
  BACKDROP_FLOOR_METALNESS,
  LEG_HEIGHT,
  STAGE_HEIGHT,
  LEG_SIZE,
  LEG_INSET,
  LEG_COLOR,
  STAGE_COLOR,
  STAGE_INSET,
} from "./constants.js";

/**
 * v1.79.0 — Cabinet base group: the marble floor plane + the 4
 * silver legs + the silver stage slab the cabinet body sits on.
 *
 * Extracted from ClosetFromConfig so the orchestrator stays
 * focused on cabinet contents. The base group has no
 * config-driven branching — same shape for every cabinet — so
 * pulling it out is a clean win.
 *
 * Floor history:
 *   v1.35.0 — wood floor + warm-white wall behind the cabinet.
 *   v1.39.0 — sized up to a "hall" feel.
 *   v1.61.0 — switched to polished marble (procedural texture +
 *             low roughness so the Environment reflects).
 *   v1.67.0 — backdrop wall removed entirely; only the marble
 *             floor remains.
 *
 * Legs/stage history:
 *   v1.28.0 — added 4 small legs under the cabinet.
 *   v1.57.0 — refit to the supplier's actual product: 4 silver
 *             legs (8 cm) supporting a thin 2 cm silver stage
 *             that the cabinet body sits on.
 */
export default function CabinetBase({ W, D }) {
  // 4 inset corners, slightly inboard from the cabinet edges so
  // they read as feet rather than corner posts of the cabinet
  // itself.
  const legX = W / 2 - LEG_SIZE / 2 - LEG_INSET;
  const legZ = D / 2 - LEG_SIZE / 2 - LEG_INSET;

  return (
    <group>
      {/* Marble floor under the cabinet. */}
      <mesh
        position={[0, -0.001, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[BACKDROP_FLOOR_W, BACKDROP_FLOOR_D]} />
        <meshStandardMaterial
          map={getMarbleFloorTexture()}
          color="#ffffff"
          roughness={BACKDROP_FLOOR_ROUGHNESS}
          metalness={BACKDROP_FLOOR_METALNESS}
          envMapIntensity={1.0}
        />
      </mesh>

      {/* 4 silver corner legs + silver stage slab the cabinet
          body sits on. Polished silver via high metalness + low
          roughness — reads like machined aluminum / chrome. */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh
          key={`leg-${i}`}
          position={[sx * legX, LEG_HEIGHT / 2, sz * legZ]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[LEG_SIZE, LEG_HEIGHT, LEG_SIZE]} />
          <meshStandardMaterial
            color={LEG_COLOR}
            roughness={0.25}
            metalness={0.85}
          />
        </mesh>
      ))}
      <mesh
        position={[0, LEG_HEIGHT + STAGE_HEIGHT / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[
            Math.max(0.05, W - 2 * STAGE_INSET),
            STAGE_HEIGHT,
            Math.max(0.05, D - 2 * STAGE_INSET),
          ]}
        />
        <meshStandardMaterial
          color={STAGE_COLOR}
          roughness={0.30}
          metalness={0.75}
        />
      </mesh>
    </group>
  );
}
