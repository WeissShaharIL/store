import { describe, it, expect } from "vitest";
import { doorGeometry } from "./geometry.js";

// Cabinet body 2.30 m × panel thickness 0.02 m. Matches a typical
// 240 cm closet (240 cm - 10 cm leg+stage = 230 cm body) with the
// v1.62.0 default panel thickness of 2 cm.
const dims = { H: 2.3, T: 0.02 };
const innerH = dims.H - 2 * dims.T; // 2.26 m

describe("doorGeometry()", () => {
  it("returns full inner height as the door area when there's no drawer stack", () => {
    const g = doorGeometry({ drawerStack: 0 }, dims);
    expect(g.stack).toBe(0);
    expect(g.split).toBe(false);
    expect(g.drawerAreaH).toBe(0);
    expect(g.doorAreaH).toBeCloseTo(innerH, 6);
    expect(g.compartmentBottomY).toBeCloseTo(dims.T, 6);
    expect(g.compartmentTopY).toBeCloseTo(dims.H - dims.T, 6);
    expect(g.doorCenterY).toBeCloseTo(dims.H / 2, 6);
  });

  it("treats missing drawerStack as zero", () => {
    const g = doorGeometry({}, dims);
    expect(g.stack).toBe(0);
    expect(g.doorAreaH).toBeCloseTo(innerH, 6);
  });

  it("shortens the door by exactly 15% of inner height per drawer row", () => {
    const g1 = doorGeometry({ drawerStack: 1 }, dims);
    const g2 = doorGeometry({ drawerStack: 2 }, dims);
    expect(g1.drawerAreaH).toBeCloseTo(innerH * 0.15, 6);
    expect(g2.drawerAreaH).toBeCloseTo(innerH * 0.30, 6);
    expect(g1.doorAreaH).toBeCloseTo(innerH * 0.85, 6);
    expect(g2.doorAreaH).toBeCloseTo(innerH * 0.70, 6);
  });

  it("places the drawer area at the cabinet bottom and the door above it", () => {
    const g = doorGeometry({ drawerStack: 2 }, dims);
    expect(g.drawerAreaBottomY).toBeCloseTo(dims.T, 6);
    expect(g.drawerAreaTopY).toBe(g.compartmentBottomY);
    expect(g.compartmentTopY).toBeCloseTo(dims.H - dims.T, 6);
    // Door center is halfway through the (shortened) door area.
    expect(g.doorCenterY).toBeCloseTo(
      g.compartmentBottomY + g.doorAreaH / 2,
      6,
    );
  });

  it("propagates drawerSplit verbatim", () => {
    expect(doorGeometry({ drawerStack: 2, drawerSplit: true }, dims).split).toBe(true);
    expect(doorGeometry({ drawerStack: 2, drawerSplit: false }, dims).split).toBe(false);
    expect(doorGeometry({ drawerStack: 2 }, dims).split).toBe(false);
  });

  it("split is always false when there's no drawer stack", () => {
    // Even if a config wrongly sets drawerSplit on a stackless door,
    // the no-stack branch overrides to false.
    expect(doorGeometry({ drawerStack: 0, drawerSplit: true }, dims).split).toBe(false);
  });
});
