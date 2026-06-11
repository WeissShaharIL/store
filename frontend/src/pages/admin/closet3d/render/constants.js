/**
 * v1.79.0 — visual + geometric constants used by ClosetFromConfig
 * and its sub-renderers. Extracted out of the main file so the
 * renderer stays a thin orchestrator and these tuning knobs live
 * in one place with their history comments preserved.
 *
 * The values are in WORLD units (meters), matching three.js's
 * default scale. The schema stores cm; ClosetFromConfig divides
 * by 100 once at the top of the render so everything below works
 * in meters.
 */

// v1.48.0 — exterior dimension callouts (width + height) rendered
// just outside the cabinet silhouette. v1.70.0 — line thickness
// trimmed from 0.012 (12 mm) to 0.005 (5 mm). At the cabinet's
// scale, 12 mm read as a chunky black bar; 5 mm reads like a real
// architect's dimension stroke without disappearing at zoomed-out
// camera distances.
export const DIM_LINE_THICKNESS = 0.005;
export const DIM_LINE_OFFSET = 0.45;   // distance the line floats outside the cabinet
export const DIM_CAP_LENGTH = 0.10;    // perpendicular end-cap length
export const DIM_COLOR = "#2a2a2a";

// Visual constants for "open" door state.
export const HINGED_OPEN_RAD = 1.4; // ≈ 80° swing
// v1.70.0 — sliding-door open distance is now exactly one
// compartment width (was 1.2 cw via SLIDING_OPEN_SHIFT_FACTOR).
// Doors slide BEHIND the adjacent door instead of past the cabinet
// edge — see renderDoor for the rationale.

// v1.28.0 — cabinet sits on 4 small legs.
// v1.57.0 — refit to the actual product spec: 4 SILVER legs (8 cm
// tall) supporting a thin 2 cm silver stage that the cabinet body
// sits on. Total stage+leg assembly = 10 cm. The configured `H`
// (in cm) now represents the TOTAL visible height including this
// assembly, so the cabinet body uses `H - STAGE_LEG_TOTAL_H` and
// the body group is offset up by STAGE_LEG_TOTAL_H.
export const LEG_HEIGHT = 0.08;          // 8 cm
export const STAGE_HEIGHT = 0.02;        // 2 cm
export const STAGE_LEG_TOTAL_H = LEG_HEIGHT + STAGE_HEIGHT;  // 10 cm
export const LEG_SIZE = 0.045;
export const LEG_INSET = 0.025;
export const LEG_COLOR = "#bfbfbf";      // silver
export const STAGE_COLOR = "#c8c8c8";    // slightly lighter silver
export const STAGE_INSET = 0.005;        // stage just slightly inside cabinet footprint

// v1.61.0 — top panel slightly overhangs the cabinet body on the
// front + sides (back edge stays flush with the cabinet back).
// Subtle "crown" detail — adds character without changing the
// cabinet's effective footprint.
export const TOP_CROWN_OVERHANG = 0.012; // 12 mm

// v1.57.0 — small visual gap between a hinged door and its
// compartment edge. Before, doors were inset by the full panel
// thickness T (~5 cm) on each side, producing a ~10 cm gap
// between adjacent closed doors. 3 mm matches real-world hinged
// closet doors and reads as "flush" at thumbnail scale.
export const HINGED_DOOR_EDGE_MARGIN = 0.003;

// v1.29.0 introduced door shortening with bottom drawers; v1.31.0
// switched the math from "fixed door fraction" to "fixed drawer
// row height". Each drawer row is `DRAWER_ROW_FRACTION` of the
// cabinet's inner height, so adding a row always claims the SAME
// amount of vertical space:
//   drawerStack=1 → door shortened by 1 × 15% = 15%
//   drawerStack=2 → door shortened by 2 × 15% = 30%
export const DRAWER_ROW_FRACTION = 0.15;
// v2.x — fixed drawer-row height (23 cm) replaces the fraction-based
// sizing so drawers look the same regardless of closet height.
// Capped at 65% of inner height so extreme stacks stay renderable.
export const DRAWER_ROW_H = 0.23;

// v1.35.0 — when a drawer is "open" the face slides forward by
// this many world units. 30 cm reads as clearly pulled-out
// without going so far that the drawer feels disconnected from
// the cabinet.
export const DRAWER_OPEN_SHIFT = 0.3;

// v1.35.0 — wood floor + warm-white wall behind the cabinet.
// v1.39.0 — sized up to a "hall" feel.
// v1.67.0 — backdrop wall removed entirely. The cabinet now sits
// in a "big open room" lit only by the Environment preset + the
// warm ambient/directional rig; the marble floor stays.
export const BACKDROP_FLOOR_W = 20;
export const BACKDROP_FLOOR_D = 16;
// v1.61.0 — floor was a matte warm-tan plane. Now a polished
// marble surface: procedural marble texture (textures.js) + low
// roughness so the Environment (`apartment` preset) reflects off
// it. Cabinet base gets faintly mirrored, sells "showroom floor"
// instead of "carpet sample."
export const BACKDROP_FLOOR_ROUGHNESS = 0.18;
export const BACKDROP_FLOOR_METALNESS = 0.10;
