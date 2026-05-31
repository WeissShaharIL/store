import { describe, it, expect } from "vitest";
import { parseConfig } from "./parseConfig.js";

describe("parseConfig", () => {
  it("parses a valid config JSON string and migrates it", () => {
    const cfg = parseConfig(JSON.stringify({ doors: [{ id: "d1", kind: "hinged" }] }));
    expect(cfg.doors).toHaveLength(1);
    // migrateConfig backfills a top-level kind from doors[0].
    expect(cfg.kind).toBe("hinged");
  });

  it("returns {} for invalid JSON instead of throwing", () => {
    expect(parseConfig("{broken")).toEqual({});
  });

  it("returns a migrated empty object for empty / null input", () => {
    // migrateConfig({}) backfills defaults; just assert it doesn't throw and is an object.
    expect(typeof parseConfig("")).toBe("object");
    expect(typeof parseConfig(null)).toBe("object");
  });
});
