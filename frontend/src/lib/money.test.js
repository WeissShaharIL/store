import { describe, it, expect } from "vitest";
import { formatILS, toIntString } from "./money.js";

describe("formatILS", () => {
  it("formats a number as ILS currency with no decimals", () => {
    const out = formatILS(1234);
    // he-IL currency formatting includes the ₪ sign; don't assert exact
    // whitespace/placement (locale-dependent), just the integer + symbol.
    expect(out).toContain("1,234");
    expect(out).toContain("₪");
  });

  it("rounds to the nearest integer", () => {
    expect(formatILS(1234.6)).toContain("1,235");
    expect(formatILS(1234.4)).toContain("1,234");
  });

  it("treats invalid / missing input as 0", () => {
    expect(formatILS(undefined)).toContain("0");
    expect(formatILS(null)).toContain("0");
    expect(formatILS("not a number")).toContain("0");
  });
});

describe("toIntString", () => {
  it("returns the rounded integer as a string", () => {
    expect(toIntString(42)).toBe("42");
    expect(toIntString(42.7)).toBe("43");
  });

  it("returns '0' for invalid input", () => {
    expect(toIntString(undefined)).toBe("0");
    expect(toIntString("abc")).toBe("0");
  });
});
