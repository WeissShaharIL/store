import { describe, it, expect } from "vitest";
import {
  fittingCounts,
  resolveVariant,
  estimatePrice,
  totalPrice,
  totalWidth,
  selectedExtras,
  resolveHandle,
} from "./schema.js";

// A fully-specified config so every pricing input is controlled.
function makeConfig(overrides = {}) {
  return {
    kind: "hinged",
    dimensions: { H: 240, D: 56, compartmentWidth: 80 },
    doors: [
      { id: "d1", kind: "hinged" },
      { id: "d2", kind: "hinged" },
    ],
    addOns: [],
    ...overrides,
  };
}

describe("totalWidth", () => {
  it("multiplies compartment width by door count", () => {
    expect(totalWidth(makeConfig())).toBe(160);
  });
  it("defaults to 80 × 1 when data is missing", () => {
    expect(totalWidth({})).toBe(80);
  });
});

describe("resolveVariant", () => {
  const comp = {
    defaultVariant: "v1",
    variants: [
      { id: "v1", items: [{ type: "shelf", y: 0.5 }] },
      { id: "v2", items: [{ type: "rod", y: 0.8 }] },
    ],
  };
  it("returns the default variant when no state override", () => {
    expect(resolveVariant(comp, undefined).id).toBe("v1");
  });
  it("returns the state-selected variant", () => {
    expect(resolveVariant(comp, "v2").id).toBe("v2");
  });
  it("falls back to the first variant for an unknown id", () => {
    expect(resolveVariant(comp, "nope").id).toBe("v1");
  });
  it("returns null when there's no compartment / no variants", () => {
    expect(resolveVariant(null)).toBeNull();
    expect(resolveVariant({ variants: [] })).toBeNull();
  });
});

describe("fittingCounts", () => {
  it("counts items across compartments plus external drawer stacks", () => {
    const cfg = makeConfig({
      doors: [
        {
          id: "d1",
          compartment: {
            defaultVariant: "x",
            variants: [{ id: "x", items: [{ type: "shelf" }, { type: "shelf" }, { type: "rod" }] }],
          },
        },
        { id: "d2", drawerStack: 2 }, // external drawers, no compartment
      ],
    });
    expect(fittingCounts(cfg)).toEqual({ shelf: 2, rod: 1, drawer: 2 });
  });

  it("is all zeros for doors with no compartment and no stack", () => {
    expect(fittingCounts(makeConfig())).toEqual({ shelf: 0, rod: 0, drawer: 0 });
  });
});

describe("selectedExtras", () => {
  const cfg = makeConfig({
    addOns: [
      { id: "a", price: 200 },
      { id: "b", price: 150 },
    ],
  });
  it("returns only add-ons whose ids are selected", () => {
    expect(selectedExtras(cfg, { selectedAddOnIds: ["b"] })).toEqual([{ id: "b", price: 150 }]);
  });
  it("returns [] when nothing is selected", () => {
    expect(selectedExtras(cfg, {})).toEqual([]);
  });
});

describe("estimatePrice", () => {
  // 1.6m × 2.4m × 450 = 1728; + 2×120 = 240; + 1.6×56×1.4 = 125.44 → 2093.44 → 2093
  it("prices a bare hinged 2-door cabinet", () => {
    expect(estimatePrice(makeConfig())).toBe(2093);
  });

  it("adds the sliding surcharge (+300)", () => {
    expect(estimatePrice(makeConfig({ kind: "sliding" }))).toBe(2393);
  });

  it("adds per-fitting cost (shelf 35 / rod 45 / drawer 90)", () => {
    const cfg = makeConfig({
      doors: [
        {
          id: "d1",
          compartment: {
            defaultVariant: "x",
            variants: [{ id: "x", items: [{ type: "shelf" }, { type: "rod" }, { type: "drawer" }] }],
          },
        },
        { id: "d2" },
      ],
    });
    // base 2093.44 + 35 + 45 + 90 = 2263.44 → 2263
    expect(estimatePrice(cfg)).toBe(2263);
  });

  it("adds selected add-on prices", () => {
    const cfg = makeConfig({ addOns: [{ id: "a", price: 500 }] });
    expect(estimatePrice(cfg, { state: { selectedAddOnIds: ["a"] } })).toBe(2593);
  });

  it("totalPrice(config, state) matches estimatePrice", () => {
    const cfg = makeConfig();
    expect(totalPrice(cfg, {})).toBe(estimatePrice(cfg));
  });

  it("never returns a fractional price", () => {
    expect(Number.isInteger(estimatePrice(makeConfig()))).toBe(true);
  });
});

describe("resolveHandle", () => {
  it("returns the key, defaulting to silver", () => {
    expect(resolveHandle("gold")).toBe("gold");
    expect(resolveHandle(undefined)).toBe("silver");
  });
});
