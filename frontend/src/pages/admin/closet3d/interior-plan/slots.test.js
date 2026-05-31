import { describe, it, expect } from "vitest";
import {
  SNAP_POSITIONS,
  SLOT_EPS,
  snapToSlot,
  findFreeSlotIndex,
} from "./slots.js";

// Actual slots: [0.07, 0.16, 0.26, 0.35, 0.44, 0.53, 0.63, 0.72, 0.82, 0.93]
// Middle-out fill order: 4,5,3,6,2,7,1,8,0,9  → index 4 (0.44) is filled first.

describe("SNAP_POSITIONS", () => {
  it("has 10 ascending slots strictly inside floor..ceiling", () => {
    expect(SNAP_POSITIONS).toHaveLength(10);
    expect([...SNAP_POSITIONS].sort((a, b) => a - b)).toEqual(SNAP_POSITIONS);
    expect(SNAP_POSITIONS[0]).toBeGreaterThan(0);
    expect(SNAP_POSITIONS[9]).toBeLessThan(1);
  });

  it("SLOT_EPS is a small positive epsilon", () => {
    expect(SLOT_EPS).toBeGreaterThan(0);
    expect(SLOT_EPS).toBeLessThan(0.1);
  });
});

describe("snapToSlot", () => {
  it("snaps an exact slot value to itself", () => {
    for (const s of SNAP_POSITIONS) {
      expect(snapToSlot(s)).toBe(s);
    }
  });

  it("snaps a nearby value to the closest slot", () => {
    expect(snapToSlot(0.08)).toBe(0.07); // 0.07 (d=.01) beats 0.16 (d=.08)
    expect(snapToSlot(0.5)).toBe(0.53);  // 0.53 (d=.03) beats 0.44 (d=.06)
    expect(snapToSlot(0.46)).toBe(0.44); // 0.44 (d=.02) beats 0.53 (d=.07)
  });

  it("snaps out-of-range values to the nearest end slot", () => {
    expect(snapToSlot(-5)).toBe(SNAP_POSITIONS[0]);
    expect(snapToSlot(99)).toBe(SNAP_POSITIONS[9]);
  });
});

describe("findFreeSlotIndex", () => {
  it("returns the middle slot (index 4) first when empty", () => {
    expect(findFreeSlotIndex([], "shelf")).toBe(4);
  });

  it("skips the occupied middle slot, taking index 5 next", () => {
    expect(findFreeSlotIndex([{ y: SNAP_POSITIONS[4] }], "shelf")).toBe(5);
  });

  it("returns null when all 10 slots are occupied", () => {
    const all = SNAP_POSITIONS.map((y) => ({ y }));
    expect(findFreeSlotIndex(all, "shelf")).toBeNull();
  });

  it("treats an item NEAR a slot as occupying it (snap-based)", () => {
    // 0.45 snaps to 0.44 (index 4) → index 4 taken → next is 5.
    expect(findFreeSlotIndex([{ y: 0.45 }], "shelf")).toBe(5);
  });

  it("handles null/undefined existing list as empty", () => {
    expect(findFreeSlotIndex(undefined, "shelf")).toBe(4);
    expect(findFreeSlotIndex(null, "shelf")).toBe(4);
  });
});
