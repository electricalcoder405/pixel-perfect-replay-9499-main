import { describe, expect, it } from "vitest";
import { hasValidGpsFix } from "../gps";

describe("hasValidGpsFix", () => {
  it("treats (0, 0) as no fix", () => {
    expect(hasValidGpsFix(0, 0)).toBe(false);
    expect(hasValidGpsFix(0, 0, true)).toBe(false);
  });
  it("accepts a real position", () => {
    expect(hasValidGpsFix(26.728964, 83.436817)).toBe(true);
  });
  it("accepts a position on the equator or prime meridian", () => {
    expect(hasValidGpsFix(0, 83.4)).toBe(true);
    expect(hasValidGpsFix(26.7, 0)).toBe(true);
  });
  it("respects an explicit receiver flag of no fix", () => {
    expect(hasValidGpsFix(26.7, 83.4, false)).toBe(false);
  });
  it("rejects out-of-range and non-finite values", () => {
    expect(hasValidGpsFix(91, 10)).toBe(false);
    expect(hasValidGpsFix(10, 181)).toBe(false);
    expect(hasValidGpsFix(Number.NaN, 10)).toBe(false);
  });
});
