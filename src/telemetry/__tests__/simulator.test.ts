import { describe, expect, it } from "vitest";
import { initialTelemetry } from "../model";
import { simulate } from "../simulator";
import { ACCEL, accelToPercent } from "../units";

const fixedRand = () => 0.5; // zero jitter

describe("simulate", () => {
  it("advances mission time and packet count by one", () => {
    const next = simulate(initialTelemetry, fixedRand);
    expect(next.missionTime).toBe(1);
    expect(next.packetCount).toBe(1);
  });
  it("produces acceleration in the configured unit (about 1 g at rest)", () => {
    const next = simulate(initialTelemetry, fixedRand);
    const magnitude = Math.hypot(next.accelerationX, next.accelerationY, next.accelerationZ);
    expect(magnitude).toBeCloseTo(ACCEL.gravity, 1);
  });
  it("keeps normalised attitude in range and mirrors raw values when already in range", () => {
    let t = initialTelemetry;
    for (let i = 0; i < 200; i++) {
      t = simulate(t, Math.random);
      expect(t.roll).toBeGreaterThan(-180);
      expect(t.roll).toBeLessThanOrEqual(180);
      expect(t.rollRaw).toBeCloseTo(t.roll, 9);
    }
  });
});

describe("accelToPercent", () => {
  it("centres zero at 50 and maps full scale to 100", () => {
    expect(accelToPercent(0)).toBe(50);
    expect(accelToPercent(ACCEL.fullScale)).toBe(100);
    expect(accelToPercent(-ACCEL.fullScale)).toBe(0);
  });
});
