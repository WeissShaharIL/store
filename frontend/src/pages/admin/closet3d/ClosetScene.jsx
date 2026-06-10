import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import { Spherical, Vector3 } from "three";

/**
 * Shared canvas + lighting + controls wrapper for every Dev*3D
 * closet prototype. Extracted in v1.19.0 from the duplicated
 * <Canvas> blocks that lived in each closet file.
 *
 * Defaults are chosen for the existing prototypes (3–4 unit tall
 * closet, 3-unit wide). Override per-closet when geometry differs
 * significantly.
 *
 * The Environment HDR doubles as the reflection source for
 * mirror doors — drei's `"apartment"` preset (which resolves to
 * `lebombo_1k.hdr`) gives a believable furniture-showroom look.
 *
 * v1.85.0 — the HDR is self-hosted at `/hdr/lebombo_1k.hdr`
 * (frontend/public/hdr/). Previously we used drei's `preset=`
 * shortcut, which lazy-fetches the file from
 * raw.githubusercontent.com/pmndrs/drei-assets — a third-party
 * origin that the v1.82.0 CSP correctly blocked, which crashed
 * the WebGL context outright. Self-hosting kept the same visual
 * look (it's literally the same HDR) and let us drop the third-
 * party connect-src allowance.
 *
 * v1.47.0 — optional `spotlight` mode darkens the scene and adds
 * two spotlights pointing at the cabinet from the top-left and
 * top-right at 45°. v1.47.1 retuned it for real "showroom-at-
 * night" drama. v1.64.0 — removed: no consumer was passing
 * `spotlight={true}` anymore (gallery cards are static, designer
 * never enabled it), and the user asked to drop the toggle from
 * the builder toolbar. Light setup simplified back to a single
 * ambient + directional rig, tuned warm.
 *
 * v1.48.0 — optional `introAnimation` mode: the camera starts on a
 * straight-front view of the cabinet and smoothly eases over to the
 * default orbit position over INTRO_DURATION_MS. While the intro is
 * running OrbitControls is disabled so the user's drag doesn't fight
 * the interpolation; user input (pointerdown / wheel / touch) aborts
 * the intro and immediately re-enables controls.
 *
 * v1.51.0 — intro path upgraded from a straight position lerp to
 * a spherical interpolation (orbit arc around the cabinet) +
 * lowered the start Y so the camera visibly rises during the move.
 * Result: instead of "camera slides sideways", it now feels like
 * "camera arcs around the cabinet and lifts up" — what a real
 * dolly-jib shot looks like.
 *
 * v1.50.0 — `frameloop` + `interactive` props for static thumbnails.
 * Gallery cards pass `frameloop="never"` + `interactive={false}` so
 * each card renders exactly one frame from the orbit camera position
 * and then freezes (no CPU/GPU after init, no OrbitControls, no
 * door-click handlers wired in). The whole card becomes a "still
 * image" of the closet without us having to capture it as an actual
 * image file. The designer (live preview) keeps the defaults.
 *
 * Children render between the light setup and the contact shadows
 * + orbit controls, so they participate in both shadow casting
 * and click/raycaster events.
 */

const INTRO_DURATION_MS = 5000;

// Cubic ease-out. Fast start, decelerating throughout, near-zero
// velocity at the end. Matches the v1.52.1 user direction "ease
// movement at the end" — camera dollies away decisively and settles
// gently into the orbit position rather than gliding through a
// symmetric in-out curve.
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// Lives inside <Canvas> so it can read camera + listen to events on
// the gl canvas element. Runs each frame, interpolates camera
// position along a spherical arc around `lookAt` (true orbital
// motion — radius, polar angle, and azimuth each lerp from `from`
// to `to`), re-aims the camera at `lookAt` (OrbitControls is
// disabled during the intro so we own both position + orientation),
// and calls onComplete when done or when the user interrupts. Render
// returns null — pure side-effect component.
//
// Spherical interp (vs straight position lerp in v1.48.0) produces
// a curved arc instead of a chord between the two points — what a
// real camera dolly would do orbiting around a subject. Looks
// noticeably more cinematic, especially when `from` and `to` differ
// substantially in azimuth.
function CameraIntro({ from, to, lookAt, durationMs, onComplete }) {
  const { camera, gl } = useThree();
  const startMs = useRef(null);
  const finished = useRef(false);

  // Decompose endpoints into (radius, phi, theta) once on mount.
  // phi = polar angle from +Y (0 = looking from above, π = below),
  // theta = azimuth around Y from +Z toward +X.
  const fromSph = useMemo(
    () => sphericalOffsetFrom(from, lookAt),
    [from, lookAt]
  );
  const toSph = useMemo(
    () => sphericalOffsetFrom(to, lookAt),
    [to, lookAt]
  );
  // Hoist scratch objects so we don't allocate per frame.
  const tmpSph = useRef(new Spherical());
  const tmpVec = useRef(new Vector3());

  useEffect(() => {
    const finish = () => {
      if (finished.current) return;
      finished.current = true;
      onComplete?.();
    };
    const el = gl.domElement;
    el.addEventListener("pointerdown", finish);
    el.addEventListener("wheel", finish, { passive: true });
    el.addEventListener("touchstart", finish, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", finish);
      el.removeEventListener("wheel", finish);
      el.removeEventListener("touchstart", finish);
    };
  }, [gl, onComplete]);

  useFrame(() => {
    if (finished.current) return;
    if (startMs.current == null) startMs.current = performance.now();
    const elapsed = performance.now() - startMs.current;
    const t = Math.min(1, elapsed / durationMs);
    const eased = easeOutCubic(t);

    // Lerp radius and polar linearly. Azimuth needs shortest-arc
    // handling so we don't take the long way around when crossing
    // the ±π discontinuity.
    tmpSph.current.radius =
      fromSph.radius + (toSph.radius - fromSph.radius) * eased;
    tmpSph.current.phi =
      fromSph.phi + (toSph.phi - fromSph.phi) * eased;
    let dTheta = toSph.theta - fromSph.theta;
    if (dTheta > Math.PI) dTheta -= 2 * Math.PI;
    else if (dTheta < -Math.PI) dTheta += 2 * Math.PI;
    tmpSph.current.theta = fromSph.theta + dTheta * eased;

    tmpVec.current.setFromSpherical(tmpSph.current);
    camera.position.set(
      lookAt[0] + tmpVec.current.x,
      lookAt[1] + tmpVec.current.y,
      lookAt[2] + tmpVec.current.z
    );
    camera.lookAt(lookAt[0], lookAt[1], lookAt[2]);

    if (t >= 1) {
      finished.current = true;
      onComplete?.();
    }
  });

  return null;
}

/* v0.83.0 — lives inside <Canvas>. Assigns a capture function to captureRef:
   given a camera world-position [x,y,z], it aims the camera at the cabinet,
   renders one frame, and returns a PNG dataURL. Restores the camera after so
   the user's orbit view is untouched. Requires the Canvas to have been created
   with gl={{ preserveDrawingBuffer: true }}. */
function CaptureController({ captureRef, targetY }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    captureRef.current = (position) => {
      const prev = camera.position.clone();
      if (position) camera.position.set(position[0], position[1], position[2]);
      camera.lookAt(0, targetY, 0);
      camera.updateProjectionMatrix();
      gl.render(scene, camera);
      const url = gl.domElement.toDataURL("image/png");
      camera.position.copy(prev);
      camera.lookAt(0, targetY, 0);
      camera.updateProjectionMatrix();
      gl.render(scene, camera);
      return url;
    };
    return () => { captureRef.current = null; };
  }, [captureRef, gl, scene, camera, targetY]);
  return null;
}

function sphericalOffsetFrom(pos, lookAt) {
  const offset = new Vector3(
    pos[0] - lookAt[0],
    pos[1] - lookAt[1],
    pos[2] - lookAt[2]
  );
  const s = new Spherical().setFromVector3(offset);
  return { radius: s.radius, phi: s.phi, theta: s.theta };
}

export default function ClosetScene({
  children,
  cameraPosition = [4.2, 3.0, 6.2],
  cameraFov = 38,
  targetY = 2.0,
  minDistance = 3.5,
  maxDistance = 12,
  shadowsScale = 9,
  introAnimation = false,
  frameloop = "always",
  interactive = true,
  /* v1.90.0 — when true, render a creamy-white room (back wall +
     two side walls + floor) around the cabinet so the model reads
     as "placed in a hall" instead of floating in nothing. Used by
     ShowroomGrid cards, DevClosetDetails overlay, and
     DevClosetDesigner. Default false to preserve the admin builder's
     neutral working background. */
  hall = false,
  /* Optional React node rendered as an overlay in the top-left corner of the
     canvas (e.g. <SceneDoorControls/>). When provided, the canvas is wrapped in
     a position:relative container so the actions can sit absolutely. */
  overlayActions = null,
  /* v0.80.0 — when set, the scene enables preserveDrawingBuffer and mounts a
     CaptureController that assigns a (position)=>dataURL fn to this ref. */
  captureRef = null,
}) {
  // When the intro is on, the camera mounts pretty close to the
  // cabinet, centered horizontally, at cabinet-center eye-level.
  // The intro animator then dollies it back + lifts it slightly +
  // pans slightly to the right, easing out into the orbit
  // position. The arc is a true spherical interp around `lookAt`
  // (radius / phi / theta each lerp).
  const introStartPosition = useMemo(() => {
    if (!introAnimation) return cameraPosition;
    const closeZ = Math.max(2, cameraPosition[2] * 0.75);
    return [0, targetY, closeZ];
  }, [introAnimation, cameraPosition, targetY]);

  const [introDone, setIntroDone] = useState(!introAnimation);

  const canvas = (
    <Canvas
      shadows
      camera={{ position: introStartPosition, fov: cameraFov }}
      dpr={[1, 2]}
      frameloop={frameloop}
      gl={captureRef ? { preserveDrawingBuffer: true } : undefined}
      onCreated={({ camera }) => {
        // Aim the camera at the cabinet on canvas creation. Normally
        // OrbitControls handles this, but for static thumbnails
        // (interactive={false}) there's no OrbitControls, so the
        // camera would otherwise keep its default -Z look direction
        // and the cabinet would drift off-center as cameraPosition
        // varies.
        camera.lookAt(0, targetY, 0);
      }}
    >
      <color attach="background" args={["#f0f0f0"]} />
      <Environment files="/hdr/lebombo_1k.hdr" background={false} />
      {/* v1.64.0 — ambient + directional are now warm-tinted to
          sell "indoor showroom" lighting. The Environment
          (`apartment` preset) contributes the bulk of the
          reflections; these two fill in shadows + cast the main
          highlight. Warm tones combine well with the wallpaper
          wall + marble floor without making the cabinet look
          orange. */}
      <ambientLight color="#fff0c2" intensity={0.5} />
      <directionalLight
        position={[5, 8, 4]}
        intensity={1.05}
        color="#fff5d8"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={20}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />

      {hall && <Hall />}

      {children}

      {captureRef && <CaptureController captureRef={captureRef} targetY={targetY} />}

      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.55}
        scale={shadowsScale}
        blur={2.4}
        far={3}
        resolution={512}
      />

      {introAnimation && !introDone && (
        <CameraIntro
          from={introStartPosition}
          to={cameraPosition}
          lookAt={[0, targetY, 0]}
          durationMs={INTRO_DURATION_MS}
          onComplete={() => setIntroDone(true)}
        />
      )}

      {interactive && (
        <OrbitControls
          enabled={introDone}
          enablePan
          minDistance={minDistance}
          maxDistance={maxDistance}
          maxPolarAngle={Math.PI / 2.05}
          target={[0, targetY, 0]}
        />
      )}
    </Canvas>
  );

  /* When overlay actions are provided, wrap the canvas in a position:relative
     container so they can sit absolutely in a corner. Otherwise return the bare
     canvas to preserve every existing layout (callers may have CSS sized to the
     canvas itself). */
  if (!overlayActions) {
    return canvas;
  }

  return (
    <div className="closet-scene-with-toggle">
      {canvas}
      {overlayActions}
    </div>
  );
}

/* v1.90.0 — Hall scene: back wall + two side walls in creamy
 * white. The cabinet's existing CabinetBase already provides a
 * polished marble floor (20m x 16m, at y = -0.001), so the hall
 * doesn't add its own floor — see v1.90.2 below. */
const HALL_WALL_COLOR = "#f3ece0";
/* v1.91.0 — dim-mode wall color. Dark charcoal, not pure black, so
   shadows still read as variations rather than solid voids. Adds
   contrast against white / pale cabinet colors that previously
   washed out against the cream walls. */
const HALL_WALL_COLOR_DIM = "#2a2a30";
const HALL_HEIGHT = 5;
const HALL_DEPTH_BEHIND = 2.5;
const HALL_DEPTH_FRONT = 6;
const HALL_HALF_WIDTH = 4.5;

function Hall({ dim = false }) {
  const wallColor = dim ? HALL_WALL_COLOR_DIM : HALL_WALL_COLOR;
  return (
    <group>
      {/* Back wall — sits behind the cabinet's back face with a
          comfortable gap. The cabinet's back is at z ≈ -0.3 for a
          typical 60cm deep wardrobe; placing the wall at -HALL_DEPTH_BEHIND
          gives ~2 m breathing room behind. */}
      <mesh
        position={[0, HALL_HEIGHT / 2, -HALL_DEPTH_BEHIND]}
      >
        <planeGeometry args={[HALL_HALF_WIDTH * 2 + 2, HALL_HEIGHT]} />
        <meshBasicMaterial color={wallColor} />
      </mesh>

      {/* Left wall — at x = -HALL_HALF_WIDTH, normal points +X
          (inward). Rotated 90° around Y so the plane's front face
          is visible to the cabinet. */}
      <mesh
        rotation={[0, Math.PI / 2, 0]}
        position={[-HALL_HALF_WIDTH, HALL_HEIGHT / 2, (HALL_DEPTH_FRONT - HALL_DEPTH_BEHIND) / 2]}
      >
        <planeGeometry args={[HALL_DEPTH_FRONT + HALL_DEPTH_BEHIND, HALL_HEIGHT]} />
        <meshBasicMaterial color={wallColor} />
      </mesh>

      {/* Right wall — at x = +HALL_HALF_WIDTH, normal points -X
          (inward). Rotated -90° around Y. */}
      <mesh
        rotation={[0, -Math.PI / 2, 0]}
        position={[HALL_HALF_WIDTH, HALL_HEIGHT / 2, (HALL_DEPTH_FRONT - HALL_DEPTH_BEHIND) / 2]}
      >
        <planeGeometry args={[HALL_DEPTH_FRONT + HALL_DEPTH_BEHIND, HALL_HEIGHT]} />
        <meshBasicMaterial color={wallColor} />
      </mesh>
    </group>
  );
}
