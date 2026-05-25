import { useMemo } from "react";
import {
  Plank, AluminumStrip, Shelf, HangingRod, Drawer,
  SlidingDoor, HingedDoor, SidePerimeter,
} from "./primitives.jsx";
import { DEFAULT_HANDLES, DEFAULT_HANDLE, handleMaterialFor, resolveColorKey } from "./palettes.js";
import { usePaletteColors } from "../PaletteContext.jsx";
import { useHandles } from "../HandlesContext.jsx";
import { getTextureForKey } from "./textures.js";
import { resolveVariant, totalWidth } from "./schema.js";
// v1.79.0 — base scenery (floor + legs + stage), exterior dimension
// callouts, the door-geometry helper, and the shared visual
// constants all live under ./render/ now so this file is a thin
// orchestrator rather than a 800-line monolith.
import CabinetBase from "./render/CabinetBase.jsx";
import DimensionAnnotations from "./render/DimensionAnnotations.jsx";
import { doorGeometry as computeDoorGeometry } from "./render/geometry.js";
import {
  HINGED_OPEN_RAD,
  STAGE_LEG_TOTAL_H,
  TOP_CROWN_OVERHANG,
  HINGED_DOOR_EDGE_MARGIN,
  DRAWER_OPEN_SHIFT,
} from "./render/constants.js";

/**
 * Renders any closet that matches the ClosetConfig schema.
 *
 * v1.22.0 redesign: doors and compartments are 1:1. Each door in
 * `config.doors` owns its compartment inline. Cabinet width is
 * derived from `compartmentWidth × doors.length` — adding a door
 * grows the cabinet and adds a new compartment behind it.
 *
 * The renderer is intentionally "dumb" — it has no state of its
 * own and never modifies the config or state. Customer choices
 * live in the consuming component (wrapper) and flow in via the
 * `state` prop. This separation is what enables the admin builder:
 * the builder writes configs, the runtime writes state, the
 * renderer just paints.
 *
 * The renderer DOES know what each AddOn `effect` string means —
 * that's a deliberate coupling. New visual effects require both a
 * schema entry and renderer code.
 *
 * Interactivity (all opt-in):
 *   - `onSelectItem` makes shelves / rods / drawers clickable and
 *     paints a yellow wireframe highlight on the selected one.
 *   - `onSelectDoor` (v1.25.0) makes doors clickable. The consumer
 *     typically toggles the door's id in/out of `state.openDoorIds`.
 * The customer-facing render path leaves both undefined so there's
 * no interactivity cost.
 *
 * @param {Object} props
 * @param {import("./schema.js").ClosetConfig} props.config
 * @param {import("./schema.js").ClosetState} [props.state]
 * @param {(doorIndex: number, itemIndex: number) => void} [props.onSelectItem]
 * @param {{doorIndex: number, itemIndex: number}} [props.selectedItem]
 * @param {(doorId: string) => void} [props.onSelectDoor]
 *   Click handler fired when a door mesh is clicked. The consumer
 *   decides what "click a door" means — typically toggling its
 *   id in `state.openDoorIds`.
 * @param {(drawerId: string) => void} [props.onSelectDrawer]
 *   Click handler fired when an external drawer face is clicked
 *   (v1.35.0). The consumer typically toggles the id in
 *   `state.openDrawerIds`. Variant drawer items inside compart-
 *   ments stay routed through `onSelectItem` since they share
 *   the click target with shelves and rods.
 */

export default function ClosetFromConfig({
  config,
  state = {},
  onSelectItem,
  selectedItem,
  onSelectDoor,
  onSelectDrawer,
  showDimensions = false,
}) {
  const dims = config.dimensions;
  // v1.34.0 — dimensions are stored in cm; convert to world units
  // (meters) for the renderer's math. One central conversion here
  // keeps the rest of the renderer working in plain meters.
  //
  // v1.57.0 — `dims.H` is now the TOTAL visible height (legs +
  // stage + body). The cabinet body is `totalH - STAGE_LEG_TOTAL_H`
  // and sits on top of the silver leg+stage assembly. `H` (used
  // throughout the rest of the renderer) stays as the body height
  // so the existing geometry math doesn't need to know about the
  // stage. The body group is offset upward by STAGE_LEG_TOTAL_H.
  const totalH = dims.H / 100;
  const H = Math.max(0.5, totalH - STAGE_LEG_TOTAL_H);
  const D = dims.D / 100;
  const T = dims.T / 100;
  const compartmentWidth = dims.compartmentWidth / 100;
  const W = totalWidth(config) / 100;
  const doors = config.doors ?? [];
  const N = doors.length;

  // Palette: single color in v1.22.0+. Configs from before v1.22.0
  // with a `colorChoices` array won't render — caller is expected to
  // pass v1.22.0-shape configs.
  //
  // v1.59.0 — palette entries can opt into a texture via
  // `textureKey`. When set, the resolved THREE.CanvasTexture flows
  // through to every wood-rendering primitive (Plank, Shelf,
  // Drawer, hinged + sliding doors) and gets applied as the
  // material's `map`. Currently only the `mevuka` color opts in.
  // v1.75.0 — palette is admin-managed (loaded via PaletteContext);
  // `colors` reflects the live API list (or DEFAULT_COLORS fallback
  // while loading). The lookup chain stays the same as v1.74.0:
  // resolveColorKey rewrites legacy aliases first, then we index
  // into the live map, with `almond` as the final fallback.
  const { colors } = usePaletteColors();
  // v1.84.0 — handles also moved to a DB-backed admin catalog. The
  // primitives accept a `handleMaterial` object ({color, roughness,
  // metalness}); we resolve the catalog entry via the same fallback
  // chain renderDoor used to use with HANDLES, then run it through
  // handleMaterialFor() to get the renderer-shaped props.
  const { handles } = useHandles();
  const resolveHandle = (key) =>
    handleMaterialFor(
      handles[key] ?? handles[DEFAULT_HANDLE] ?? DEFAULT_HANDLES[DEFAULT_HANDLE],
    );
  const palette = useMemo(() => {
    const id = resolveColorKey(config.color, colors) ?? "almond";
    const c = colors[id] ?? colors.almond ?? Object.values(colors)[0];
    // v1.99.11 — always call getTextureForKey. When the palette
    // entry has no textureKey, the function returns a universal
    // "neutral grain" texture (very subtle noise) instead of
    // null, so every surface in the renderer reads as live
    // material rather than flat plastic. Pre-1.99.11 we
    // short-circuited to null and the renderer rendered solid
    // color, which the user reported as "doesnt feel real."
    const texture = getTextureForKey(c?.textureKey);
    return {
      wood: c?.wood ?? "#ddd0b6",
      trim: c?.trim ?? "#b8a98d",
      back: c?.wood ?? "#ddd0b6",
      texture,
    };
  }, [config.color, colors]);

  // Resolve add-on effects into a single flags object.
  const effects = useMemo(() => {
    const out = { aluminumOnShelves: false, aluminumPerimeterOnSides: false };
    for (const addOn of config.addOns ?? []) {
      if (state.addOns?.[addOn.id]) out[addOn.effect] = true;
    }
    return out;
  }, [config.addOns, state.addOns]);

  // Each compartment's inner cavity (between dividers/sides).
  // Subtract a margin so shelves don't z-fight the panels.
  const innerCompartmentWidth = Math.max(0.05, compartmentWidth - 2 * T - 0.02);
  const innerCompartmentDepth = Math.max(0.05, D - 2 * T - 0.02);
  const rodLength = innerCompartmentWidth - 0.04;

  // v1.79.0 — door-geometry math extracted to ./render/geometry.js
  // and tested in isolation. The wrapper here is just a partial
  // application of {H, T} so the existing callers stay one-arg.
  const doorGeometry = (door) => computeDoorGeometry(door, { H, T });

  // X-center of compartment i (0..N-1). The cabinet is centered at
  // x=0, so compartment 0 sits to the far left.
  const compartmentCenterX = (i) =>
    -W / 2 + compartmentWidth * (i + 0.5);

  // Per-door sliding offset. For the 2-door case, preserve the
  // bidirectional metaphor inherited from v1.21.0 (-1 = left door
  // covers right compartment; +1 = right door covers left). For N>2
  // doors, slide is treated as static (renderer punts on a multi-
  // door slide animation — that's a polish item).
  const slide = state.doorSlide ?? 0;
  const slideOffsetFor = (i) => {
    if (N !== 2) return 0;
    // i=0 is left door, i=1 is right door.
    if (i === 0 && slide < 0) return -slide * compartmentWidth;
    if (i === 1 && slide > 0) return -slide * compartmentWidth;
    return 0;
  };

  // For sliding doors, alternate tracks (back / front) so adjacent
  // doors overlap cleanly. The door's `track` prop wins if set.
  const trackZ = {
    front: D / 2 + 0.022,
    back:  D / 2 + 0.005,
  };
  const defaultTrackFor = (i) => (i % 2 === 0 ? "back" : "front");

  const hingedAngle = state.hingedOpenAngle ?? 0;

  // v1.62.0 — when the cabinet has no internal divider, the
  // interior is one open box. Only compartment 0 contributes items
  // (the "primary" compartment), and each item is sized to the FULL
  // inner cabinet width instead of per-compartment width. Skipping
  // compartments 1+ avoids the floating half-width shelves with a
  // gap in the middle that the v1.60.0 dividerless mode produced.
  const cabinetIsOpen = !(config.hasInternalDivider ?? false);
  const innerCabinetWidth = Math.max(0.05, W - 2 * T - 0.02);
  const fullRodLength = innerCabinetWidth - 0.04;

  // Render the contents of one compartment (shelves + rods + drawers).
  function renderCompartment(door, doorIndex) {
    if (cabinetIsOpen && doorIndex > 0) return null;
    const variant = resolveVariant(door.compartment, state.compartmentVariants?.[door.id]);
    const cx = cabinetIsOpen ? 0 : compartmentCenterX(doorIndex);
    const itemWidth = cabinetIsOpen ? innerCabinetWidth : innerCompartmentWidth;
    const itemRodLength = cabinetIsOpen ? fullRodLength : rodLength;
    // Variant drawer items inside this compartment share the door's
    // resolved handle option — same fallback chain renderDoor uses.
    const compartmentHandleKey =
      state.doorHandles?.[door.id] ??
      door.handleColor ??
      config.handleColor ??
      DEFAULT_HANDLE;
    const compartmentHandleMaterial = resolveHandle(compartmentHandleKey);
    // The compartment's vertical range is shortened when the door has
    // drawerStack > 0 — variant items map to the door's remaining
    // space, not the full cabinet inner height.
    const { compartmentBottomY, compartmentTopY } = doorGeometry(door);
    const toYInCompartment = (yNorm) =>
      compartmentBottomY + yNorm * (compartmentTopY - compartmentBottomY);
    return variant.items.map((item, i) => {
      const y = toYInCompartment(item.y);
      const key = `d${doorIndex}-i${i}`;
      const isSelected =
        selectedItem &&
        selectedItem.doorIndex === doorIndex &&
        selectedItem.itemIndex === i;
      const wrap = (node) => {
        if (!onSelectItem) return node;
        return (
          <group
            key={key}
            onClick={(e) => {
              e.stopPropagation();
              onSelectItem(doorIndex, i);
            }}
          >
            {node}
            {isSelected && (
              <mesh position={[cx, y, 0]}>
                <boxGeometry
                  args={[
                    itemWidth + 0.04,
                    0.08,
                    innerCompartmentDepth + 0.04,
                  ]}
                />
                <meshBasicMaterial color="#ffd84a" wireframe />
              </mesh>
            )}
          </group>
        );
      };
      if (item.type === "shelf") {
        return wrap(
          <Shelf
            key={key}
            position={[cx, y, 0]}
            color={palette.wood}
            texture={palette.texture}
            withAluminum={effects.aluminumOnShelves}
            depth={innerCompartmentDepth}
            width={itemWidth}
          />
        );
      }
      if (item.type === "rod") {
        return wrap(
          <HangingRod
            key={key}
            position={[cx, y, 0]}
            length={itemRodLength}
            bracketColor={palette.trim}
          />
        );
      }
      if (item.type === "drawer") {
        /* v1.99.13 — compartment-internal drawers (placed via
           the stage-2 interior planner) are now clickable +
           animate forward when open, matching the
           front-of-cabinet drawer stack's existing behavior.
           Pre-1.99.13 these drawers only had selection-click
           wiring for the admin builder (`onSelectItem`) — the
           customer designer's `onSelectDrawer` was never
           consumed, so clicks did nothing visible.

           Drawer id: `item-<doorId>-<itemIndex>`. Format is
           per-compartment so a drawer in compartment A doesn't
           share state with the drawer at the same index in
           compartment B.

           Behavior split:
             - admin builder path (onSelectItem set): wrap() still
               handles selection-click + yellow wireframe outline.
             - customer designer path (onSelectDrawer set, no
               onSelectItem): drawer node gets its own click
               wrapper that toggles open/close. */
        const drawerId = `item-${door.id}-${i}`;
        const isDrawerOpen =
          state.openDrawerIds?.includes(drawerId) ?? false;
        let node = wrap(
          <Drawer
            key={key}
            position={[
              cx,
              y,
              D / 2 - T + (isDrawerOpen ? DRAWER_OPEN_SHIFT : 0),
            ]}
            width={itemWidth}
            depth={innerCompartmentDepth}
            color={palette.wood}
            texture={palette.texture}
            handleMaterial={compartmentHandleMaterial}
          />
        );
        if (!onSelectItem && onSelectDrawer) {
          node = (
            <group
              key={key}
              onClick={(e) => {
                e.stopPropagation();
                onSelectDrawer(drawerId);
              }}
            >
              {node}
            </group>
          );
        }
        return node;
      }
      return null;
    });
  }

  // Render the door panel for compartment i.
  //
  //   hidden  (state.hideDoors / hideDoorIds): return null.
  //   open    (state.openDoorIds includes door.id): render at OPEN
  //             position (sliding doors shift outward past the
  //             closet edge; hinged swing to HINGED_OPEN_RAD).
  //   closed  (default): render in closed position.
  //
  // When `onSelectDoor` is provided (builder + gallery), wrap the
  // rendered door in a clickable group so the consumer can toggle
  // its open state in response.
  function renderDoor(door, i) {
    if (state.hideDoors) return null;
    if (state.hideDoorIds?.includes(door.id)) return null;
    const isOpen = state.openDoorIds?.includes(door.id) ?? false;
    const material = state.doorMaterials?.[door.id] ?? door.defaultMaterial ?? "wood";
    const baseX = compartmentCenterX(i);
    const { doorAreaH, doorCenterY } = doorGeometry(door);
    // v1.69.0 — per-door handle. State override wins (customer
    // designer step 3 picks per-door), then the door's own field,
    // then the cabinet's default handle, then silver as a final
    // fallback. Look-up is a no-op for old configs that never set
    // a handle: HANDLES[DEFAULT_HANDLE] is still aluminum-tinted
    // silver, matching the historical rendering.
    const handleKey =
      state.doorHandles?.[door.id] ??
      door.handleColor ??
      config.handleColor ??
      DEFAULT_HANDLE;
    const handleMaterial = resolveHandle(handleKey);

    const wrap = (node) => {
      if (!onSelectDoor) return node;
      // v1.89.2 — when sliding doors are eye-toggled hidden, drop
      // the click handler so clicks pass through the invisible
      // geometry. v1.98.3 — keep the wrapping <group> MOUNTED
      // (just null out onClick), otherwise React unmounts the
      // group + its SlidingDoor child on toggle, and the
      // newly-mounted SlidingDoor starts at fadeOpacity=0 — no
      // animation from 1 → 0, doors flicker out instantly. Now
      // the same SlidingDoor instance stays mounted across the
      // toggle, its useEffect catches the prop change, and the
      // useFrame loop crossfades opacity over 2 s.
      const isSlidingHidden =
        door.kind === "sliding" && state.slidingDoorsHidden;
      return (
        <group
          key={door.id}
          onClick={
            isSlidingHidden
              ? undefined
              : (e) => {
                  e.stopPropagation();
                  onSelectDoor(door.id);
                }
          }
        >
          {node}
        </group>
      );
    };

    if (door.kind === "sliding") {
      const z = trackZ[door.track ?? defaultTrackFor(i)];
      const panelWidth = compartmentWidth + 0.05;
      // v1.70.0 — opening a sliding door slides it BEHIND the
      // adjacent door on the opposite track (one compartment width
      // toward the cabinet's center / neighboring door) instead of
      // outward past the cabinet edge.
      //
      // v1.89.1 — the v1.70 rule (even slides right, odd slides
      // left) worked perfectly for 2 doors but for 3-door cabinets
      // the rightmost door (i=2, even) slid +cw and ended up
      // OUTSIDE the cabinet's right edge — "falling out" exactly
      // the failure mode v1.70 was meant to fix.
      // New rule: doors in the left half of the cabinet slide
      // right (+1), doors in the right half slide left (-1). Each
      // door now lands one compartment closer to the center,
      // tucking behind whichever adjacent door is on the opposite
      // track. Equivalent to the v1.70 rule for N=2 (i=0 → +1,
      // i=1 → -1) so the existing 2-door behavior is preserved.
      // Generalizes correctly to any N: every door lands within
      // the cabinet bounds, on a different track from the door it
      // overlaps with.
      const openDir = i < N / 2 ? 1 : -1;
      const shift = isOpen
        ? openDir * compartmentWidth
        : slideOffsetFor(i);
      return wrap(
        <SlidingDoor
          key={door.id}
          position={[baseX + shift, doorCenterY, z]}
          width={panelWidth}
          panelHeight={doorAreaH}
          panelThickness={T}
          material={material}
          woodColor={palette.wood}
          woodTexture={palette.texture}
          handleMaterial={handleMaterial}
          handleSide={i < N / 2 ? "left" : "right"}
          fadeOpacity={state.slidingDoorsHidden ? 0 : 1}
        />
      );
    }
    if (door.kind === "hinged") {
      const hingeSide = door.hingeSide ?? (i % 2 === 0 ? "left" : "right");
      const halfCW = compartmentWidth / 2;
      // v1.57.0 — hinge sits right next to the divider/side edge
      // (HINGED_DOOR_EDGE_MARGIN inside the compartment), and the
      // door panel covers nearly the full compartment width with
      // just enough margin to keep adjacent doors from touching.
      // Before, this used `T` (panel thickness, ~5 cm) on both
      // sides, leaving a ~10 cm gap between adjacent closed doors.
      const hingeX = baseX + (hingeSide === "left"
        ? -halfCW + HINGED_DOOR_EDGE_MARGIN
        : halfCW - HINGED_DOOR_EDGE_MARGIN);
      const doorPanelW = compartmentWidth - 2 * HINGED_DOOR_EDGE_MARGIN;
      const openAngle = isOpen ? HINGED_OPEN_RAD : hingedAngle;
      return wrap(
        <HingedDoor
          key={door.id}
          hingeWorldPos={[hingeX, doorCenterY, D / 2]}
          width={doorPanelW}
          panelHeight={doorAreaH}
          thickness={T}
          hingeSide={hingeSide}
          openAngle={openAngle}
          material={material}
          woodColor={palette.wood}
          woodTexture={palette.texture}
          handleMaterial={handleMaterial}
          fadeOpacity={state.slidingDoorsHidden ? 0 : 1}
        />
      );
    }
    return null;
  }

  // Render the external drawer stack (and dividing shelf) below a
  // shortened door. Lives outside renderDoor's click-target group
  // so opening / hiding the door doesn't take the drawers with it.
  //
  // v1.31.0 — supports the `drawerSplit` flag: when set, each row
  // is divided in half by a vertical plank, with two drawer faces
  // per row instead of one.
  function renderDrawerStack(door, i) {
    const { stack, split, drawerAreaH, drawerAreaBottomY, drawerAreaTopY } =
      doorGeometry(door);
    if (!stack) return null;
    const cx = compartmentCenterX(i);
    const drawerHeight = drawerAreaH / stack;
    // External-drawer faces share the door's resolved handle option
    // (same fallback chain renderDoor uses).
    const stackHandleKey =
      state.doorHandles?.[door.id] ??
      door.handleColor ??
      config.handleColor ??
      DEFAULT_HANDLE;
    const stackHandleMaterial = resolveHandle(stackHandleKey);

    // X offsets and per-face width depend on split. Without split:
    // one centered face spanning innerCompartmentWidth. With split:
    // two faces offset to either side of the center divider,
    // each sized to fit half the compartment minus the divider.
    const colOffsets = split
      ? [-compartmentWidth / 4, compartmentWidth / 4]
      : [0];
    const faceWidth = split
      ? Math.max(0.05, (innerCompartmentWidth - T - 0.02) / 2)
      : innerCompartmentWidth;

    return (
      <group key={`stack-${door.id}`}>
        {/* Horizontal divider between the door's compartment and
            the drawer area. */}
        <Plank
          position={[cx, drawerAreaTopY, 0]}
          args={[compartmentWidth - 2 * T - 0.01, T, D - T]}
          color={palette.trim}
          texture={palette.texture}
        />
        {/* Vertical divider down the middle of the drawer area
            when split. */}
        {split && (
          <Plank
            position={[cx, drawerAreaBottomY + drawerAreaH / 2, 0]}
            args={[T, drawerAreaH, D - T]}
            color={palette.trim}
            texture={palette.texture}
          />
        )}
        {/* N rows × M columns of drawer faces. Each face is
            clickable when `onSelectDrawer` is provided — the
            consumer toggles the id in state.openDrawerIds. When
            open, the face + body shift forward by
            DRAWER_OPEN_SHIFT so the drawer reads as pulled-out. */}
        {Array.from({ length: stack }).map((_, r) =>
          colOffsets.map((dx, c) => {
            const drawerId = `stack-${door.id}-${r}-${c}`;
            const isOpen = state.openDrawerIds?.includes(drawerId) ?? false;
            const drawer = (
              <Drawer
                position={[
                  cx + dx,
                  drawerAreaBottomY + drawerHeight * (r + 0.5),
                  D / 2 + T + (isOpen ? DRAWER_OPEN_SHIFT : 0),
                ]}
                width={faceWidth}
                depth={innerCompartmentDepth}
                color={palette.wood}
                texture={palette.texture}
                height={drawerHeight - 0.02}
                handleMaterial={stackHandleMaterial}
              />
            );
            if (!onSelectDrawer) {
              return <group key={drawerId}>{drawer}</group>;
            }
            return (
              <group
                key={drawerId}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDrawer(drawerId);
                }}
              >
                {drawer}
              </group>
            );
          })
        )}
      </group>
    );
  }

  return (
    <group>
      {/* v1.79.0 — base scenery (floor + legs + stage) lives in
          its own component. v1.67.0 removed the backdrop wall;
          the cabinet floats over the marble floor with the
          Environment preset as the only visible background. */}
      <CabinetBase W={W} D={D} />

      {/* Exterior dimension callouts (v1.48.0). Anchored in
          cabinet-local world space so they rotate with the
          cabinet as the camera orbits.
          v1.57.0 — span the FULL configured height (legs + stage
          + body) from the floor, matching the customer's mental
          model: "this closet is 240 cm tall" includes everything. */}
      {showDimensions && (
        <DimensionAnnotations
          W={totalWidth(config) / 100}
          H={totalH}
          D={D}
          cabinetY0={0}
        />
      )}

      {/* Cabinet body lifted to rest on the silver stage.
          Everything below uses H = body height (= totalH -
          STAGE_LEG_TOTAL_H), and lives at y = STAGE_LEG_TOTAL_H
          in world coords. */}
      <group position={[0, STAGE_LEG_TOTAL_H, 0]}>
      {/* Back panel.
          v1.90.5 — inset construction (W-2T × H-2T) so it fits
          BETWEEN the side panels horizontally and BETWEEN the
          top + bottom panels vertically. This matches real
          cabinet carpentry (a back board screwed into the back
          edges of the structural frame from inside) and
          eliminates the corner overlap entirely. */}
      <Plank
        position={[0, H / 2, -D / 2 + T / 2]}
        args={[Math.max(0.05, W - 2 * T), Math.max(0.05, H - 2 * T), T]}
        color={palette.back}
        texture={palette.texture}
      />
      {/* Top + bottom. v1.61.0 — top panel gets a small "crown"
          overhang on front + sides (back edge stays flush). The
          shifted Z + extra D push the panel forward by the
          overhang amount so the back stays at the cabinet back. */}
      <Plank
        position={[0, H - T / 2, TOP_CROWN_OVERHANG / 2]}
        args={[W + 2 * TOP_CROWN_OVERHANG, T, D + TOP_CROWN_OVERHANG]}
        color={palette.trim}
        texture={palette.texture}
      />
      <Plank position={[0, T / 2,     0]} args={[W, T, D]} color={palette.trim} texture={palette.texture} />
      {/* Sides */}
      <Plank position={[-W / 2 + T / 2, H / 2, 0]} args={[T, H, D]} color={palette.trim} texture={palette.texture} />
      <Plank position={[ W / 2 - T / 2, H / 2, 0]} args={[T, H, D]} color={palette.trim} texture={palette.texture} />

      {/* Optional aluminum perimeter outline on each side panel. */}
      {effects.aluminumPerimeterOnSides && (
        <>
          <SidePerimeter outerX={-W / 2} height={H} depth={D} />
          <SidePerimeter outerX={ W / 2} height={H} depth={D} />
        </>
      )}

      {/* Vertical dividers between adjacent compartments (N-1 of
          them). v1.60.0 — admin opt-in via `config.hasInternalDivider`.
          Missing → defaults handled by migrateConfig (legacy
          templates = true; new templates = false). When false the
          cabinet is one open box behind multiple doors, which
          matches the actual 2-door product line. */}
      {(config.hasInternalDivider ?? false) &&
        Array.from({ length: Math.max(0, N - 1) }).map((_, k) => {
          const x = -W / 2 + compartmentWidth * (k + 1);
          return (
            <Plank
              key={`div-${k}`}
              position={[x, H / 2, 0]}
              args={[T, H - 2 * T, D - T]}
              color={palette.trim}
              texture={palette.texture}
            />
          );
        })}

      {/* Compartment contents */}
      {doors.map((door, i) => renderCompartment(door, i))}

      {/* Track rails for sliding-door wardrobes — only meaningful
          when at least one sliding door is present. */}
      {config.hasTrackRails && doors.some((d) => d.kind === "sliding") && (
        <>
          <AluminumStrip
            position={[0, H - 0.02, D / 2 + 0.012]}
            args={[W, 0.06, 0.05]}
          />
          <AluminumStrip
            position={[0, 0.02, D / 2 + 0.012]}
            args={[W, 0.04, 0.05]}
          />
        </>
      )}

      {/* External drawer stacks below shortened doors. Rendered
          before the doors so the door (when open / hidden) layers
          properly over the still-static drawers behind. */}
      {doors.map((door, i) => renderDrawerStack(door, i))}

      {/* Doors */}
      {doors.map((door, i) => renderDoor(door, i))}
      </group>
    </group>
  );
}
