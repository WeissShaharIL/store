import { DRAWER_ROW_H } from "./constants.js";

/**
 * v1.79.0 — door-geometry helper. Extracted from ClosetFromConfig
 * so the math has a stable shape that's testable without a Three.js
 * scene around it.
 *
 * v1.29.0 introduced door shortening with bottom drawers; v1.31.0
 * switched the math from "fixed door fraction" to "fixed drawer
 * row height". Each drawer row is `DRAWER_ROW_FRACTION` of the
 * cabinet's inner height, so adding a row always claims the SAME
 * amount of vertical space:
 *   drawerStack=1 → door shortened by 1 × 15% = 15%
 *   drawerStack=2 → door shortened by 2 × 15% = 30%
 *
 * @param {Object} door — `door` entry from ClosetConfig.doors
 * @param {Object} dims — body height (H) + panel thickness (T) in
 *   world units (meters); the renderer already converts from cm.
 * @returns {Object} ranges:
 *   stack, split, drawerAreaH, doorAreaH,
 *   compartmentBottomY, compartmentTopY, doorCenterY,
 *   drawerAreaBottomY, drawerAreaTopY
 */
export function doorGeometry(door, { H, T }) {
  const innerH = H - 2 * T;
  const stack = door.drawerStack ?? 0;

  if (!stack) {
    return {
      stack: 0,
      split: false,
      drawerAreaH: 0,
      doorAreaH: innerH,
      compartmentBottomY: T,
      compartmentTopY: H - T,
      doorCenterY: H / 2,
      drawerAreaBottomY: T,
      drawerAreaTopY: T,
    };
  }

  // Each row is a fixed 23 cm slice. Total drawer area grows with
  // row count; capped at 65% of inner height so extreme stacks
  // still leave a visible door/compartment.
  const drawerAreaH = Math.min(DRAWER_ROW_H * stack, innerH * 0.65);
  const doorAreaH = innerH - drawerAreaH;
  const compartmentBottomY = T + drawerAreaH;
  const compartmentTopY = H - T;
  return {
    stack,
    split: !!door.drawerSplit,
    drawerAreaH,
    doorAreaH,
    compartmentBottomY,
    compartmentTopY,
    doorCenterY: compartmentBottomY + doorAreaH / 2,
    drawerAreaBottomY: T,
    drawerAreaTopY: compartmentBottomY,
  };
}
