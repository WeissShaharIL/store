import { describe, it, expect } from "vitest";
import {
  SNAP_POSITIONS,
  SLOT_EPS,
  snapToSlot,
  findFreeSlotIndex,
} from "./slots.js";

describe("SNAP_POSITIONS", () => {
  it("has 10 ascending slots between floor and ceiling", () => {
    expect(SNAP_POSITIONS).toHaveLength(10);
    const sorted = [...SNAP_POSITIONS].sort((a, b) => a - b);
    expect(SNAP_POSITIONS).toEqual(sorted);
    expect(SNAP_POSITIONS[0]).toBeGreaterThan(0);
    expect(SNAP_POSITIONS[SNAP_POSITIONS.length - 1]).toBeLessThan(1);
  });
});

describe("snapToSlot", () => {
  it("snaps an exact slot value to itself", () => {
    for (const s of SNAP_POSITIONS) {
      expect(snapToSlot(s)).toBe(s);
    }
  });

  it("snaps a nearby value to the closest slot", () => {
    expect(snapToSlot(0.08)).toBe(0.07);
    expect(snapToSlot(0.5)).toBe(0.53); // 0.53 is closer than 0.44
  });

  it("clamps below-floor / above-ceiling to the nearest end slot", () => {
    expect(snapToSlot(-5)).toBe(SNAP_POSITIONS[0]);
    expect(snapToSlot(99)).toBe(SNAP_POSITIONS[SNAP_POSITIONS.length - 1]);
  });
});

describe("findFreeSlotIndex", () => {
  it("returns a middle slot first when empty", () => {
    expect(findFreeSlotIndex([], "shelf")).toBe(4);
  });

  it("skips an occupied slot", () => {
    // slot index 4 (0.44) occupied → next preferred is 5.
    const idx = findFreeSlotIndex([{ y: SNAP_POSITIONS[4] }], "shelf");
    expect(idx).toBe(5);
  });

  it("returns null when all 10 slots are occupied", () => {
    const all = SNAP_POSITIONS.map((y) => ({ y }));
    expect(findFreeSlotIndex(all, "shelf")).toBeNull();
  });

  it("treats a slot within SLOT_EPS as occupied", () => {
    const nudged = SNAP_POSITIONS[4] + SLOT_EPS / 2;
    const idx = findFreeSlotIndex([{ y: nudged }], "shelf");
    expect(idx).not.toBe(4);
  });
});
