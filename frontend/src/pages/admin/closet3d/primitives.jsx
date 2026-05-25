/**
 * Reusable 3D primitives for closet rendering. Extracted in v1.19.0
 * from the duplicates that lived inside each Dev*3D component.
 *
 * Every primitive takes its geometry as props — no module-level
 * CLOSET_W / CLOSET_H / etc. — so a single component can render at
 * any size. The consuming closet owns the dimensions; the primitives
 * own the appearance.
 *
 * What's a primitive vs. what's the closet:
 *   Primitive — a single piece you'd "drop in" while building a
 *               closet (one shelf, one door, one strip of trim).
 *   Closet    — the assembly of primitives into a wardrobe with
 *               whatever-specific geometry (compartments, layouts).
 *
 * When the admin builder ships, the palette of things they can drag
 * onto a canvas is roughly this file's export list.
 */
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { MATERIAL_TINTS, HANDLES, DEFAULT_HANDLE } from "./palettes.js";

// v1.61.0 — every wood-rendering box (planks + door panels) uses
// drei's RoundedBox with a tiny radius to soften the edges.
// Sharp 90° corners read as CG; even a 5-7 mm chamfer reads as
// real furniture. smoothness=2 keeps geometry cost low (still
// renders fine for ~10 templates in the gallery).
const PLANK_EDGE_RADIUS = 0.006; // 6 mm
const PLANK_EDGE_SMOOTHNESS = 2;

/* v1.44.0 — smooth animation helper. Returns a stable ref that
 * gets its `position` / `rotation` axis lerped toward the latest
 * `target` each frame. On mount the axis snaps to the initial
 * target so first-render doesn't animate from origin. On every
 * subsequent prop change the axis eases toward the new target via
 * an exponential approach (~0.3s to settle at speed=10).
 *
 * `kind` is "position" or "rotation"; `axis` is "x" | "y" | "z".
 * Other axes are snapped to target (no easing) so non-animated
 * dimensions update immediately when the config / layout changes. */
function useAnimatedAxis(target, kind, axis, speed = 10) {
  const ref = useRef();
  const targetRef = useRef(target);
  targetRef.current = target;
  const initialized = useRef(false);
  useEffect(() => {
    // No-op effect; kept to make the hook's mount ordering explicit.
  }, []);
  useFrame((_, delta) => {
    const obj = ref.current;
    if (!obj) return;
    const t = targetRef.current;
    const vec = obj[kind];
    if (!initialized.current) {
      vec.x = t[0];
      vec.y = t[1];
      vec.z = t[2];
      initialized.current = true;
      return;
    }
    const f = Math.min(1, delta * speed);
    // Lerp only the chosen axis; snap the others. Snapping non-
    // animated axes lets the renderer move a door / drawer in 3D
    // (when the cabinet dimensions change, for example) without
    // the animation curve fighting the layout.
    if (axis === "x") {
      vec.x += (t[0] - vec.x) * f;
      vec.y = t[1];
      vec.z = t[2];
    } else if (axis === "y") {
      vec.x = t[0];
      vec.y += (t[1] - vec.y) * f;
      vec.z = t[2];
    } else {
      vec.x = t[0];
      vec.y = t[1];
      vec.z += (t[2] - vec.z) * f;
    }
  });
  return ref;
}

/* ─────────── Box / Plank ───────────
 * Structural panel: back, sides, top, bottom, divider — all of these
 * are just oriented boxes with a wood color.
 *
 * v1.59.0 — optional `texture` prop (a THREE.Texture). When set,
 * the material uses it as `map` and falls back to white as the
 * multiplied color so the texture shows true. Without a texture,
 * the solid `color` paints as before. */
export function Plank({ position, args, color, texture, ...rest }) {
  return (
    <RoundedBox
      args={args}
      radius={PLANK_EDGE_RADIUS}
      smoothness={PLANK_EDGE_SMOOTHNESS}
      position={position}
      castShadow
      receiveShadow
      {...rest}
    >
      {/* v1.62.2 — `color` is always the palette's wood/trim hex.
          When a texture is set it's now a white-based "grain mask"
          (see textures.js); meshStandardMaterial multiplies
          map × color so the resulting surface is the wood tone
          with grain on top. Robust to map binding failures — if
          the texture ever fails to apply, the color paints solid
          wood (not the previous white fallback).
          v1.78.0 — `key` flips with texture presence so toggling
          between a textured palette entry (e.g. מבוקע) and a flat
          one forces a fresh material instance. Without this,
          Three.js doesn't re-emit the USE_MAP shader define when
          `map` flips null → Texture, so the swap renders stale
          (no texture on first selection, or texture stuck onto a
          subsequent flat color). Same trick as the v1.36 transparent
          fix one component up. */}
      <meshStandardMaterial
        key={texture ? "textured" : "flat"}
        map={texture || null}
        color={color}
        roughness={0.72}
        metalness={0.05}
      />
    </RoundedBox>
  );
}

/* ─────────── AluminumStrip ───────────
 * A thin metallic bar. Used for shelf edge profiles, side perimeter
 * outlines, and the sliding-door track rails. */
export function AluminumStrip({ position, args, rotation }) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial
        color={MATERIAL_TINTS.aluminum}
        roughness={0.28}
        metalness={0.9}
      />
    </mesh>
  );
}

/* ─────────── Shelf ───────────
 * One horizontal shelf, sized to fit a compartment. Optional aluminum
 * profile along the front edge. */
export function Shelf({ position, color, texture, width, depth, withAluminum }) {
  return (
    <group position={position}>
      <Plank
        position={[0, 0, 0]}
        args={[width, 0.04, depth]}
        color={color}
        texture={texture}
      />
      {withAluminum && (
        <AluminumStrip
          position={[0, 0, depth / 2 - 0.005]}
          args={[width, 0.05, 0.015]}
        />
      )}
    </group>
  );
}

/* ─────────── Drawer ───────────
 * A drawer = face + body extending backward into the compartment.
 *
 * Reference point history:
 *   v1.29.0: `position` was a logical center; body offset was wrong
 *            and bodies stuck ~15 cm out the back panel.
 *   v1.30.0: `position` became the face BACK plane. Body fit
 *            cleanly; face front sat at position.z + faceT.
 *   v1.32.0: `position` is now the face FRONT plane. Callers pass
 *            the visible front Z directly, which makes alignment
 *            with door fronts trivial (just pass `D/2 + T`).
 *
 * The body always extends backward (-Z) from the face, sized to fit
 * inside `depth` with small front + back clearances.
 *
 * Two natural choices for the caller:
 *   - `D/2 + T` for external drawer stacks below shortened doors —
 *     face front aligns with the hinged door front.
 *   - `D/2 - T` (or thereabouts) for variant drawer items inside
 *     a compartment — face front sits recessed behind where the
 *     door panel lives. */
export function Drawer({
  position,
  width,
  depth,
  color,
  texture,
  height = 0.4,
  handleMaterial = HANDLES[DEFAULT_HANDLE],
}) {
  const handleW = width * 0.35;
  const faceT = 0.02;
  const bodyL = Math.max(0.05, depth - 0.04);
  // v1.44.0 — smooth pull-out. position.z eases toward target so
  // clicking a drawer slides it forward instead of snapping. X / Y
  // snap (those only change when the cabinet's layout does).
  const ref = useAnimatedAxis(position, "position", "z");
  return (
    <group ref={ref}>
      {/* Face — front surface at local z = 0 (caller's position.z);
          extends BACKWARD (-Z) by faceT. */}
      <Plank
        position={[0, 0, -faceT / 2]}
        args={[width, height, faceT]}
        color={color}
        texture={texture}
      />
      {/* Body — extends backward from just behind the face into
          the compartment. Small clearance (5 mm) between face
          back and body front so they don't z-fight. */}
      <Plank
        position={[0, 0, -faceT - 0.005 - bodyL / 2]}
        args={[width - 0.04, height - 0.04, bodyL]}
        color={color}
        texture={texture}
      />
      {/* Bar handle — sits a hair proud of the face. Material is
          driven by the door/drawer's resolved handle option (silver
          / white / black — v1.69.0). */}
      <mesh position={[0, 0, 0.012]} castShadow>
        <boxGeometry args={[handleW, 0.018, 0.025]} />
        <meshStandardMaterial
          color={handleMaterial.color}
          roughness={handleMaterial.roughness}
          metalness={handleMaterial.metalness}
        />
      </mesh>
    </group>
  );
}

/* ─────────── HangingRod ───────────
 * Horizontal chrome rod with two end brackets in the closet's trim
 * color. The cylinder geometry defaults to Y-up; we rotate 90° on Z
 * to lay it along X.
 *
 * v1.98.0 — rod radius bumped from 0.018 m (3.6 cm diameter) to
 * 0.028 m (5.6 cm diameter). User feedback: the rod was hard to
 * see / hard to grab visually. Heavy-duty closet rods in real
 * life are 25–32 mm diameter; 56 mm reads as more present on
 * screen at the camera distances the designer uses without
 * stepping into "obviously cartoony" territory. Bracket box
 * dimensions stayed the same — they were already proportioned
 * for a chunkier rod and now read as cleanly anchored end caps
 * instead of disproportionately large blocks. */
export function HangingRod({ position, length, bracketColor }) {
  return (
    <group position={position}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.028, 0.028, length, 20]} />
        <meshStandardMaterial color={MATERIAL_TINTS.chrome} roughness={0.3} metalness={0.85} />
      </mesh>
      <mesh position={[-length / 2 + 0.02, 0, 0]} castShadow>
        <boxGeometry args={[0.04, 0.08, 0.05]} />
        <meshStandardMaterial color={bracketColor} roughness={0.7} />
      </mesh>
      <mesh position={[length / 2 - 0.02, 0, 0]} castShadow>
        <boxGeometry args={[0.04, 0.08, 0.05]} />
        <meshStandardMaterial color={bracketColor} roughness={0.7} />
      </mesh>
    </group>
  );
}

/* ─────────── DoorMaterial / DoorPanelMaterials ───────────
 * Internal helpers picking the Three.js material props for a door
 * panel. Wood is the default; glass uses transparency; mirror uses
 * metalness 1 + low roughness so it reflects the Environment.
 *
 * v1.34.0 — mirror is a special case: the mirror lives on the
 * INSIDE face of the door, with the outer face still wood. So
 * mirror doors paint a 6-material BoxGeometry (wood on 5 faces +
 * mirror on the -Z back face). Wood and glass are uniform on all
 * faces.
 *
 * Convention: the consuming door primitive orients its mesh so
 * local +Z faces the room (outward) and local -Z faces the closet
 * interior (inward). Box face slot 5 = -Z (back), which is the
 * inside face for both hinged and sliding doors. */
function DoorMaterial({ kind, woodColor, woodTexture }) {
  if (kind === "glass") {
    return (
      <meshStandardMaterial
        color={MATERIAL_TINTS.glass}
        transparent
        opacity={0.50}
        roughness={0.05}
        metalness={0.0}
        envMapIntensity={1.5}
      />
    );
  }
  if (kind === "mirror") {
    return (
      <meshStandardMaterial
        color={MATERIAL_TINTS.mirror}
        roughness={0.04}
        metalness={1.0}
        envMapIntensity={1.4}
      />
    );
  }
  // v1.59.0 — wood doors honor an optional palette texture (currently
  // only the `mevuka` palette entry opts in). When present, the
  // wood-grain texture maps over the door panel and tints the
  // result by the palette wood color.
  // v1.62.2 — color is now always woodColor (was white when textured).
  // Texture base is white (the grain mask in textures.js), so
  // multiplication produces the right wood tone. Robust to map
  // binding failures: if the texture ever doesn't apply, the door
  // still paints its wood color instead of a confusing white.
  // v1.78.0 — `key` reflects texture presence so flipping
  // textured ↔ flat (e.g. מבוקע → לבן in designer step 3)
  // remounts the material with the right shader compile. Without
  // it, Three.js keeps the USE_MAP define on stale materials and
  // either misses the texture on first selection or sticks it to
  // a subsequent flat color.
  return (
    <meshStandardMaterial
      key={woodTexture ? "wood-textured" : "wood-flat"}
      map={woodTexture || null}
      color={woodColor}
      roughness={0.55}
      metalness={0.08}
    />
  );
}

/* Always render this with `key={kind}` from the caller so a
 * material switch forces a remount. Without the key, when the
 * `transparent` prop flips false → true in place (e.g. wood →
 * glass), Three.js doesn't recompile the shader and the new
 * "glass" door renders 100% opaque. Cycling through mirror
 * (which uses a different element shape) worked around it but
 * users hit the bug on first toggle. v1.36.0 fix. */
function DoorPanelMaterials({ kind, woodColor, woodTexture }) {
  // v1.45.0 — mirror moved off the door box. The panel itself is
  // always wood (or glass), and a separate ~70%-sized mirror plane
  // is inset on the interior side by the door primitive. So real
  // mirrored-wardrobe doors get the wood-frame-around-mirror look.
  if (kind === "glass") {
    return <DoorMaterial kind="glass" woodColor={woodColor} />;
  }
  return (
    <DoorMaterial
      kind="wood"
      woodColor={woodColor}
      woodTexture={woodTexture}
    />
  );
}

/* v1.45.0 — mirror inset panel. When a door's material is
 * "mirror", the door primitive renders this just behind the
 * door's interior face.
 *
 * v1.47.0:
 *   - Mirror is now ~92% wide × 70% tall (was 70/70). Mirror
 *     reaches nearly the full door width with a narrow side
 *     frame, and a more visible top/bottom margin where the
 *     wood door shows through.
 *   - Added a thin aluminum frame plane immediately behind the
 *     mirror so its perimeter peeks around the reflective area
 *     — reads as a metal bezel like real mirrored wardrobes. */
const MIRROR_WIDTH_FRAC = 0.92;
const MIRROR_HEIGHT_FRAC = 0.70;
const MIRROR_FRAME_MARGIN = 0.025; // aluminum bezel width (world m)

function MirrorInsetPanel({ position, width, height }) {
  const mirrorW = width * MIRROR_WIDTH_FRAC;
  const mirrorH = height * MIRROR_HEIGHT_FRAC;
  return (
    <group position={position} rotation={[0, Math.PI, 0]}>
      {/* Aluminum frame backing — slightly bigger than the mirror,
          sits a hair behind it so its perimeter is visible around
          the mirror's edges. Local +Z (the visible direction here)
          is set by the group's 180° Y rotation, so the frame at
          local z = -0.002 ends up just behind the mirror at z = 0
          from the camera's POV. */}
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry
          args={[mirrorW + MIRROR_FRAME_MARGIN * 2, mirrorH + MIRROR_FRAME_MARGIN * 2]}
        />
        <meshStandardMaterial
          color={MATERIAL_TINTS.aluminum}
          roughness={0.35}
          metalness={0.9}
        />
      </mesh>
      {/* Mirror surface. */}
      <mesh>
        <planeGeometry args={[mirrorW, mirrorH]} />
        <meshStandardMaterial
          color={MATERIAL_TINTS.mirror}
          roughness={0.04}
          metalness={1.0}
          envMapIntensity={1.4}
        />
      </mesh>
    </group>
  );
}

/* ─────────── SlidingDoor ───────────
 * Flat panel for sliding-door wardrobes. Sized by `width` and
 * `panelHeight`; the consuming closet decides where on its tracks
 * the door sits.
 *
 * v1.29.0 renamed `height` → `panelHeight` so the renderer can
 * shorten the door (for the door-shortening + bottom-drawer
 * feature) without the primitive subtracting a hardcoded margin. */
// v1.73.0 — sliding-door fade animation duration. Matches the user
// direction "fade out animation of 2 seconds." Toggling the eye
// button in the designer crossfades the door panel + handle (and
// the inset mirror if present) between fully visible (1) and
// fully hidden (0) over this many milliseconds.
const SLIDING_DOOR_FADE_MS = 2000;

export function SlidingDoor({
  position,
  width,
  panelHeight,
  panelThickness = 0.05,
  material = "wood",
  woodColor,
  woodTexture,
  visible = true,
  // v1.69.0 — sliding doors got a visible handle for the first time.
  // v1.71.0 — refit to match real product spec per the user: the
  // handle is a full-height aluminum strip running top-to-bottom
  // along the leading edge of the door (not a small bar). Width is
  // a thin channel (~15 mm), height matches the panel exactly, sits
  // a hair proud of the door face. Color/roughness/metalness still
  // driven by the resolved HANDLES option.
  handleMaterial = HANDLES[DEFAULT_HANDLE],
  handleSide = "right",
  // v1.73.0 — eye-toggle fade. 1 = fully visible, 0 = fully
  // transparent. The component animates the actual material
  // opacity toward this target over SLIDING_DOOR_FADE_MS using a
  // useFrame loop + per-mesh refs so opacity transitions look
  // smooth without re-rendering the React subtree on each frame.
  fadeOpacity = 1,
}) {
  // v1.44.0 — smooth slide on position.x.
  // v1.45.0 — wrapped in a group so the inset mirror plane shares
  // the door's animated transform. The mirror plane is rendered as
  // a sibling at the door's -Z face.
  const ref = useAnimatedAxis(position, "position", "x");
  const panelMeshRef = useRef();
  const handleMeshRef = useRef();
  // Animation state for opacity. `current` holds the live value
  // applied to materials; `from` + `target` + `start` shape the
  // linear interpolation when the target prop changes.
  const animRef = useRef({
    current: fadeOpacity,
    from: fadeOpacity,
    target: fadeOpacity,
    start: null,
  });

  useEffect(() => {
    const a = animRef.current;
    if (a.target === fadeOpacity) return;
    a.from = a.current;
    a.target = fadeOpacity;
    a.start = performance.now();
  }, [fadeOpacity]);

  useFrame(() => {
    const a = animRef.current;
    if (a.start !== null) {
      const elapsed = performance.now() - a.start;
      const t = Math.min(1, elapsed / SLIDING_DOOR_FADE_MS);
      a.current = a.from + (a.target - a.from) * t;
      if (t >= 1) a.start = null;
    }
    for (const meshRef of [panelMeshRef, handleMeshRef]) {
      const mat = meshRef.current?.material;
      if (!mat) continue;
      mat.opacity = a.current;
      // Wood/mirror materials default to transparent: false. Force
      // the transparent pipeline on first time we dip below 1 so
      // three.js actually respects the opacity. `needsUpdate`
      // triggers a one-time shader recompile — once it's set, the
      // material stays in transparent mode regardless of opacity.
      if (a.current < 1 && !mat.transparent) {
        mat.transparent = true;
        mat.needsUpdate = true;
      }
    }
  });

  if (!visible) return null;
  const castsShadow = material !== "glass";
  const STRIP_WIDTH = 0.015;
  const STRIP_DEPTH = 0.008;
  // Strip sits flush at the very edge of the door panel — its outer
  // face aligns with the panel's outer edge so it reads as the
  // door's own trim.
  const handleX =
    (handleSide === "right" ? 1 : -1) * (width / 2 - STRIP_WIDTH / 2);
  return (
    <group ref={ref}>
      <RoundedBox
        ref={panelMeshRef}
        args={[width, panelHeight, panelThickness]}
        radius={PLANK_EDGE_RADIUS}
        smoothness={PLANK_EDGE_SMOOTHNESS}
        castShadow={castsShadow}
        receiveShadow
      >
        <DoorPanelMaterials
          key={material}
          kind={material}
          woodColor={woodColor}
          woodTexture={woodTexture}
        />
      </RoundedBox>
      <mesh
        ref={handleMeshRef}
        position={[handleX, 0, panelThickness / 2 + STRIP_DEPTH / 2]}
        castShadow
      >
        <boxGeometry args={[STRIP_WIDTH, panelHeight, STRIP_DEPTH]} />
        <meshStandardMaterial
          color={handleMaterial.color}
          roughness={handleMaterial.roughness}
          metalness={handleMaterial.metalness}
        />
      </mesh>
      {material === "mirror" && (
        <MirrorInsetPanel
          position={[0, 0, -panelThickness / 2 - 0.005]}
          width={width}
          height={panelHeight}
        />
      )}
    </group>
  );
}

/* ─────────── HingedDoor ───────────
 * Door + brass handle wrapped in a group that pivots around the
 * hinge edge. `hingeSide` ("left" | "right") flips which edge is the
 * hinge and which way the door swings.
 *
 * v1.22.0 redesigned this to operate at the COMPARTMENT level
 * instead of the cabinet level. Each door now owns its compartment;
 * the renderer positions the hinge group at the compartment's
 * hinge corner and passes the compartment's width/height/depth/
 * thickness in.
 *
 *   hingeWorldPos   — [x, y, z] of the hinge edge in world space
 *                     (the renderer computes this from the
 *                     compartment's position and chosen hinge side)
 *   width           — door panel width (compartmentWidth − 2T-ish)
 *   height, depth, thickness — closet H, D, T
 *   hingeSide       — "left" hinges on the left edge of THIS door,
 *                     so the door swings to the LEFT
 *   openAngle       — radians, 0 = closed */
export function HingedDoor({
  hingeWorldPos,
  width,
  panelHeight,
  thickness,
  hingeSide,
  openAngle,
  woodColor,
  woodTexture,
  material = "wood",
  // v1.69.0 — handle is now a {color, roughness, metalness} object
  // resolved from the closet's HANDLES catalog (silver / white /
  // black) rather than a bare color string. Falls back to silver
  // for callers that don't pass anything explicit yet.
  handleMaterial = HANDLES[DEFAULT_HANDLE],
}) {
  const isLeft = hingeSide === "left";
  const pivotSign = isLeft ? -1 : 1;
  // Vertical aluminum bar handle near the FAR edge from the hinge,
  // at roughly mid-height of the door. Length scaled with the
  // door's actual panel height so shortened doors get smaller
  // handles too. (v1.28.0 — was a brass cylinder.)
  const handleX = -pivotSign * (width - 0.07);
  const handleY = -panelHeight * 0.05;
  const handleLen = Math.min(0.32, panelHeight * 0.18);
  // v1.44.0 — smooth swing. The rotation.y eases toward the target
  // angle instead of snapping; first frame still snaps so a freshly
  // mounted door appears in its correct closed/open position with
  // no opening animation on initial render.
  const ref = useAnimatedAxis(
    [0, pivotSign * openAngle, 0],
    "rotation",
    "y"
  );
  return (
    <group
      ref={ref}
      position={hingeWorldPos}
    >
      <RoundedBox
        position={[(-pivotSign * width) / 2, 0, thickness / 2]}
        args={[width, panelHeight, thickness]}
        radius={PLANK_EDGE_RADIUS}
        smoothness={PLANK_EDGE_SMOOTHNESS}
        castShadow={material !== "glass"}
        receiveShadow
      >
        <DoorPanelMaterials
          key={material}
          kind={material}
          woodColor={woodColor}
          woodTexture={woodTexture}
        />
      </RoundedBox>
      <mesh
        position={[handleX, handleY, thickness + 0.012]}
        castShadow
      >
        <boxGeometry args={[0.022, handleLen, 0.022]} />
        <meshStandardMaterial
          color={handleMaterial.color}
          roughness={handleMaterial.roughness}
          metalness={handleMaterial.metalness}
        />
      </mesh>
      {material === "mirror" && (
        <MirrorInsetPanel
          position={[(-pivotSign * width) / 2, 0, -0.005]}
          width={width}
          height={panelHeight}
        />
      )}
    </group>
  );
}

/* ─────────── SidePerimeter ───────────
 * Aluminum picture-frame trim around the visible rectangle of a
 * side panel: top edge, bottom edge, front edge, back edge. Sits
 * just outside the panel itself so it doesn't z-fight.
 *
 * `outerX` is positive for the right side, negative for the left
 * side; the strips offset further outward from there. */
export function SidePerimeter({ outerX, height, depth, stripThickness = 0.025 }) {
  const t = stripThickness;
  const lift = 0.012;
  const x = outerX > 0 ? outerX + lift : outerX - lift;
  const halfH = height / 2;
  const halfD = depth / 2;
  return (
    <group>
      <AluminumStrip
        position={[x, height - t / 2, 0]}
        args={[t, t, depth]}
      />
      <AluminumStrip
        position={[x, t / 2, 0]}
        args={[t, t, depth]}
      />
      <AluminumStrip
        position={[x, halfH, halfD - t / 2]}
        args={[t, height, t]}
      />
      <AluminumStrip
        position={[x, halfH, -halfD + t / 2]}
        args={[t, height, t]}
      />
    </group>
  );
}
