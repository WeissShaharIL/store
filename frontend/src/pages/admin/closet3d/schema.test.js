import { describe, it, expect } from "vitest";
import {
  totalWidth,
  selectedExtras,
  totalPrice,
  estimatePrice,
  componentUnitPrice,
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

describe("componentUnitPrice", () => {
  it("fixed basis reads {price}", () => {
    expect(componentUnitPrice({ price_basis: "fixed", rules: '{"price": 150}' })).toBe(150);
  });
  it("width basis matches the containing range", () => {
    const comp = {
      price_basis: "width",
      rules: '[{"from": 0, "to": 80, "price": 100}, {"from": 81, "to": null, "price": 150}]',
    };
    expect(componentUnitPrice(comp, { W: 60 })).toBe(100);
    expect(componentUnitPrice(comp, { W: 200 })).toBe(150); // open-ended range
  });
  it("malformed rules / no matching range price as 0", () => {
    expect(componentUnitPrice({ price_basis: "fixed", rules: "not json" })).toBe(0);
    expect(componentUnitPrice({ price_basis: "depth", rules: '[{"from": 90, "to": 100, "price": 50}]' }, { D: 56 })).toBe(0);
  });
});

describe("estimatePrice — admin base-price model (תמחור בסיס)", () => {
  const closetCfg = { basePriceHinged: 2000, basePriceSliding: 2600, extraDoorPrice: 300 };

  it("2-door hinged closet = base price", () => {
    expect(estimatePrice(makeConfig(), { closetCfg })).toBe(2000);
  });
  it("sliding kind uses the sliding base", () => {
    expect(estimatePrice(makeConfig({ kind: "sliding" }), { closetCfg })).toBe(2600);
  });
  it("each door beyond 2 adds extraDoorPrice", () => {
    const cfg = makeConfig({
      doors: [{ id: "d1" }, { id: "d2" }, { id: "d3" }, { id: "d4" }],
    });
    expect(estimatePrice(cfg, { closetCfg })).toBe(2000 + 2 * 300);
  });
  it("placed components charge their unit price per count", () => {
    const componentPrices = [
      { id: 5, price_basis: "fixed", rules: '{"price": 45}' },
      { id: 7, price_basis: "width", rules: '[{"from": 0, "to": 200, "price": 120}]' },
    ];
    // 2 shelves (id 5) + 1 width-priced drawer (id 7), W=160 → range hit
    expect(
      estimatePrice(makeConfig(), {
        closetCfg,
        componentPrices,
        componentCounts: { 5: 2, 7: 1 },
      }),
    ).toBe(2000 + 2 * 45 + 120);
  });
  it("falls back to the built-in formula when no base price is set", () => {
    const legacy = estimatePrice(makeConfig());
    expect(estimatePrice(makeConfig(), { closetCfg: { basePriceHinged: 0 } })).toBe(legacy);
  });
});
