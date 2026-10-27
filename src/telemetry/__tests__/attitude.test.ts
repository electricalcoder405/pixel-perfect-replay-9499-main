import { describe, expect, it } from "vitest";
import { normalizeAngle, normalizeHeading } from "../attitude";

describe("normalizeAngle", () => {
  it("leaves in-range angles unchanged", () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(45)).toBe(45);
    expect(normalizeAngle(-90)).toBe(-90);
  });
  it("wraps angles beyond ±180 (captured hardware spans about -507° to +435°)", () => {
    expect(normalizeAngle(-507.4)).toBeCloseTo(-147.4, 6);
    expect(normalizeAngle(434.87)).toBeCloseTo(74.87, 6);
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(190)).toBe(-170);
  });
  it("uses the range (-180, +180]", () => {
    expect(normalizeAngle(180)).toBe(180);
    expect(normalizeAngle(-180)).toBe(180);
    expect(normalizeAngle(540)).toBe(180);
  });
  it("returns non-finite input unchanged", () => {
    expect(Number.isNaN(normalizeAngle(Number.NaN))).toBe(true);
    expect(normalizeAngle(Infinity)).toBe(Infinity);
  });
});

describe("normalizeHeading", () => {
  it("wraps to [0, 360)", () => {
    expect(normalizeHeading(-10)).toBe(350);
    expect(normalizeHeading(360)).toBe(0);
    expect(normalizeHeading(725)).toBe(5);
  });
});
