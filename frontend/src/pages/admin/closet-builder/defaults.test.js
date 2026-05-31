import { describe, it, expect } from "vitest";
import {
  newDoor,
  newConfig,
  migrateConfig,
  defaultConstraints,
  defaultMaterialChoices,
} from "./defaults.js";

describe("newDoor", () => {
  it("creates a door with the given kind and a default compartment", () => {
    const d = newDoor(0, "sliding");
    expect(d.kind).toBe("sliding");
    expect(d.id).toBeTruthy();
    expect(d.compartment.defaultVariant).toBe("default");
    const variant = d.compartment.variants[0];
    expect(variant.id).toBe("default");
    // default template seeds 2 shelves + 1 rod
    const types = variant.items.map((i) => i.type).sort();
    expect(types).toEqual(["rod", "shelf", "shelf"]);
  });

  it("defaults to hinged", () => {
    expect(newDoor(0).kind).toBe("hinged");
  });
});

describe("newConfig", () => {
  it("creates a 2-door hinged starter cabinet", () => {
    const c = newConfig();
    expect(c.doors).toHaveLength(2);
    expect(c.kind).toBe("hinged");
    expect(c.hasInternalDivider).toBe(false);
    expect(c.dimensions.H).toBeGreaterThan(0);
    expect(c.dimensions.compartmentWidth).toBeGreaterThan(0);
    expect(c.constraints.height).toBeTruthy();
  });
});

describe("defaultConstraints", () => {
  it("returns height/width/depth ranges with min<=default<=max", () => {
    const c = defaultConstraints();
    for (const key of ["height", "width", "depth"]) {
      expect(c[key].min).toBeLessThanOrEqual(c[key].default);
      expect(c[key].default).toBeLessThanOrEqual(c[key].max);
    }
  });
});

describe("defaultMaterialChoices", () => {
  it("offers wood / glass / mirror", () => {
    const ids = defaultMaterialChoices().map((m) => m.id).sort();
    expect(ids).toEqual(["glass", "mirror", "wood"]);
  });
});

describe("migrateConfig", () => {
  it("returns falsy input unchanged", () => {
    expect(migrateConfig(null)).toBeNull();
    expect(migrateConfig(undefined)).toBeUndefined();
  });

  it("backfills kind from doors[0]", () => {
    const out = migrateConfig({ doors: [{ id: "d", kind: "sliding" }] });
    expect(out.kind).toBe("sliding");
  });

  it("defaults kind to hinged when there are no doors", () => {
    expect(migrateConfig({}).kind).toBe("hinged");
  });

  it("backfills constraints when missing", () => {
    const out = migrateConfig({ doors: [{ id: "d", kind: "hinged" }] });
    expect(out.constraints.height).toBeTruthy();
    expect(out.constraints.width).toBeTruthy();
    expect(out.constraints.depth).toBeTruthy();
  });

  it("caps an over-thick panel (T>3) down to 2cm", () => {
    const out = migrateConfig({ dimensions: { T: 5 }, doors: [] });
    expect(out.dimensions.T).toBe(2);
  });

  it("leaves a reasonable panel thickness alone", () => {
    const out = migrateConfig({ dimensions: { T: 2 }, doors: [] });
    expect(out.dimensions.T).toBe(2);
  });

  it("defaults handleColor to silver", () => {
    expect(migrateConfig({ doors: [] }).handleColor).toBe("silver");
  });

  it("is idempotent (running twice == running once)", () => {
    const once = migrateConfig({ doors: [{ id: "d", kind: "hinged" }] });
    const twice = migrateConfig(once);
    expect(twice).toEqual(once);
  });

  it("does not mutate the input object", () => {
    const input = { doors: [{ id: "d", kind: "hinged" }] };
    const snapshot = JSON.stringify(input);
    migrateConfig(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
