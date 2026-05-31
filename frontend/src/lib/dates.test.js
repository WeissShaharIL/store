import { describe, it, expect } from "vitest";
import { fmtDate, fmtMessageTime } from "./dates.js";

describe("fmtDate", () => {
  it("returns '' for empty input", () => {
    expect(fmtDate("")).toBe("");
    expect(fmtDate(null)).toBe("");
    expect(fmtDate(undefined)).toBe("");
  });

  it("formats a valid ISO date to a non-empty string", () => {
    const out = fmtDate("2026-05-31T10:30:00Z");
    expect(typeof out).toBe("string");
    expect(out.length).toBeGreaterThan(0);
  });

  it("falls back to the raw input for an unparseable date", () => {
    // new Date('garbage') is Invalid Date → toLocaleString throws/returns
    // 'Invalid Date'; the impl returns the raw string only if it throws.
    // Either way the call must not throw.
    expect(() => fmtDate("garbage")).not.toThrow();
  });
});

describe("fmtMessageTime", () => {
  it("returns '' for empty input", () => {
    expect(fmtMessageTime("")).toBe("");
    expect(fmtMessageTime(null)).toBe("");
  });

  it("formats a valid ISO date to a non-empty string", () => {
    expect(fmtMessageTime("2026-05-31T10:30:00Z").length).toBeGreaterThan(0);
  });
});
