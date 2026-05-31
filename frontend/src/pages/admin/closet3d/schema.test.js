import { describe, it, expect } from "vitest";
import {
  totalWidth,
  selectedExtras,
  totalPrice,
  estimatePrice,
  resolveVariant,
  PRICE_RATES,
} from "./schema.js";

function makeConfig(overrides = {}) {
  return {
    kind: "hinged",
    basePrice: 1000,
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
  it("treats <1 door as 1", () => {
    expect(totalWidth({ dimensions: { compartmentWidth: 80 }, doors: [] })).toBe(80);
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
  it("returns the default variant when no override is given", () => {
    expect(resolveVariant(comp, undefined).id).toBe("v1");
  });
  it("returns the explicitly selected variant", () => {
    expect(resolveVariant(comp, "v2").id).toBe("v2");
  });
  it("falls back to the first variant for an unknown id", () => {
    expect(resolveVariant(comp, "nope").id).toBe("v1");
  });
});

describe("selectedExtras", () => {
  const cfg = makeConfig({
    addOns: [
      { id: "a", label: "פרופיל מדפים", price: 200 },
      { id: "b", label: "פרופיל צדדים", price: 150 },
    ],
  });
  it("returns {label, price} for toggled-on add-ons only", () => {
    expect(selectedExtras(cfg, { addOns: { b: true } })).toEqual([
      { label: "פרופיל צדדים", price: 150 },
    ]);
  });
  it("returns [] when nothing is toggled on", () => {
    expect(selectedExtras(cfg, {})).toEqual([]);
    expect(selectedExtras(cfg, { addOns: {} })).toEqual([]);
  });
});

describe("totalPrice (template price = base + extras)", () => {
  it("is basePrice with no extras", () => {
    expect(totalPrice(makeConfig(), {})).toBe(1000);
  });
  it("adds toggled add-on prices to the base", () => {
    const cfg = makeConfig({ addOns: [{ id: "a", label: "x", price: 250 }] });
    expect(totalPrice(cfg, { addOns: { a: true } })).toBe(1250);
  });
});

describe("estimatePrice (from-scratch, dimension-based)", () => {
  // makeConfig: widthM=1.6, heightM=2.4, depthCm=56, 2 hinged doors.
  // area  = 1.6 * 2.4 * 1400 = 5376
  // doors = 2 * 180          = 360
  // depth = 1.6 * 56 * 6     = 537.6
  // sum 6273.6 → round to nearest 10 → 6270
  it("prices a bare hinged 2-door cabinet, rounded to ₪10", () => {
    expect(estimatePrice(makeConfig())).toBe(6270);
  });

  it("adds the sliding surcharge (+600)", () => {
    // 6273.6 + 600 = 6873.6 → 6870
    expect(estimatePrice(makeConfig({ kind: "sliding" }))).toBe(6870);
  });

  it("adds per-fitting cost from opts.fittings (shelf 45 / rod 35 / drawer 130)", () => {
    // 6273.6 + 45 + 35 + 130 = 6483.6 → 6480
    expect(estimatePrice(makeConfig(), { fittings: { shelf: 1, rod: 1, drawer: 1 } })).toBe(6480);
  });

  it("adds selected add-on prices via opts.state", () => {
    const cfg = makeConfig({ addOns: [{ id: "a", label: "x", price: 500 }] });
    // 6273.6 + 500 = 6773.6 → 6770
    expect(estimatePrice(cfg, { state: { addOns: { a: true } } })).toBe(6770);
  });

  it("always returns a multiple of 10", () => {
    expect(estimatePrice(makeConfig()) % 10).toBe(0);
  });

  it("exposes the documented rate table", () => {
    expect(PRICE_RATES.perSqMeterFront).toBe(1400);
    expect(PRICE_RATES.slidingSurcharge).toBe(600);
  });
});
