import { describe, it, expect } from "vitest";
import {
  SNAP_POSITIONS,
  SLOT_EPS,
  DEFAULT_SLOT,
  slotIndexFor,
  snapToSlot,
  findFreeSlotIndex,
  isExternalDrawerType,
} from "./slots.js";

// Real slots: 0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95
// DEFAULT_SLOT preferred index: shelf→5 (0.55), rod→8 (0.85), drawer→1 (0.15).
// findFreeSlotIndex fills MIDDLE-OUT from the preferred index: [p, p+1, p-1, ...].
// "Occupied" = an item within SLOT_EPS (0.001) of a slot — effectively exact.

describe("SNAP_POSITIONS", () => {
  it("is 10 evenly-spaced slots 0.05..0.95", () => {
    expect(SNAP_POSITIONS).toHaveLength(10);
    expect(SNAP_POSITIONS[0]).toBeCloseTo(0.05);
    expect(SNAP_POSITIONS[9]).toBeCloseTo(0.95);
    expect([...SNAP_POSITIONS].sort((a, b) => a - b)).toEqual(SNAP_POSITIONS);
  });
});

describe("slotIndexFor", () => {
  it("returns the index of the nearest slot", () => {
    expect(slotIndexFor(0.05)).toBe(0);
    expect(slotIndexFor(0.55)).toBe(5);
    expect(slotIndexFor(0.95)).toBe(9);
  });
  it("rounds to the closest slot for in-between values", () => {
    expect(slotIndexFor(0.52)).toBe(5); // 0.55 (d=.03) beats 0.45 (d=.07)
    expect(slotIndexFor(0.41)).toBe(4); // 0.45 (d=.04) beats 0.35 (d=.06)
  });
});

describe("snapToSlot", () => {
  it("snaps an exact slot value to itself", () => {
    for (const s of SNAP_POSITIONS) expect(snapToSlot(s)).toBeCloseTo(s);
  });
  it("snaps a nearby value to the closest slot", () => {
    expect(snapToSlot(0.08)).toBeCloseTo(0.05);
    expect(snapToSlot(0.52)).toBeCloseTo(0.55);
  });
  it("clamps out-of-range to the nearest end slot", () => {
    expect(snapToSlot(-5)).toBeCloseTo(SNAP_POSITIONS[0]);
    expect(snapToSlot(99)).toBeCloseTo(SNAP_POSITIONS[9]);
  });
});

describe("findFreeSlotIndex (middle-out from per-type preferred slot)", () => {
  it("places a shelf at its preferred slot (5) when empty", () => {
    expect(findFreeSlotIndex([], "shelf")).toBe(5);
  });
  it("places a rod at slot 8 and a drawer at slot 1 when empty", () => {
    expect(findFreeSlotIndex([], "rod")).toBe(8);
    expect(findFreeSlotIndex([], "drawer")).toBe(1);
  });
  it("steps outward (preferred+1 first) when the preferred slot is taken", () => {
    // shelf preferred 5 occupied → candidates at d=1 are [6, 4]; 6 wins.
    expect(findFreeSlotIndex([{ y: SNAP_POSITIONS[5] }], "shelf")).toBe(6);
  });
  it("falls back to preferred-1 when preferred and preferred+1 are taken", () => {
    const taken = [{ y: SNAP_POSITIONS[5] }, { y: SNAP_POSITIONS[6] }];
    expect(findFreeSlotIndex(taken, "shelf")).toBe(4);
  });
  it("returns null when all 10 slots are occupied", () => {
    const all = SNAP_POSITIONS.map((y) => ({ y }));
    expect(findFreeSlotIndex(all, "shelf")).toBeNull();
  });
  it("only treats an item within SLOT_EPS of a slot as occupying it", () => {
    // 0.60 is 0.05 away from slot 5 (>SLOT_EPS) → slot 5 still considered free.
    expect(findFreeSlotIndex([{ y: 0.6 }], "shelf")).toBe(5);
  });
  it("exposes DEFAULT_SLOT + SLOT_EPS as documented", () => {
    expect(DEFAULT_SLOT).toMatchObject({ shelf: 0.55, rod: 0.85, drawer: 0.15 });
    expect(SLOT_EPS).toBe(0.001);
  });
});

describe("external drawers are pinned to the bottom (slot 0)", () => {
  const PALETTE = [
    { id: 5, name: "מגירה חיצונית", item_type: "external_drawer" },
    { id: 6, name: "מדף", item_type: "shelf" },
  ];

  it("detects external drawers by raw type and by component chip", () => {
    expect(isExternalDrawerType("external_drawer", PALETTE)).toBe(true);
    expect(isExternalDrawerType("c:5", PALETTE)).toBe(true);
    expect(isExternalDrawerType("c:6", PALETTE)).toBe(false);
    expect(isExternalDrawerType("shelf", PALETTE)).toBe(false);
    expect(isExternalDrawerType("c:99", PALETTE)).toBe(false); // unknown id
    expect(isExternalDrawerType(undefined, PALETTE)).toBe(false);
  });

  it("places the first external drawer at the bottom slot, extras stacking upward", () => {
    // The planner drops external drawers via findFreeSlotIndex(_, "external_drawer").
    expect(findFreeSlotIndex([], "external_drawer")).toBe(0); // bottom
    expect(findFreeSlotIndex([{ y: SNAP_POSITIONS[0] }], "external_drawer")).toBe(1);
    expect(
      findFreeSlotIndex(
        [{ y: SNAP_POSITIONS[0] }, { y: SNAP_POSITIONS[1] }],
        "external_drawer",
      ),
    ).toBe(2);
  });
});
