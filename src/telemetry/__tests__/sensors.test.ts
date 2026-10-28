import { describe, expect, it } from "vitest";
import type { TelemetryField } from "../model";
import { getSensorStatus, parseSensorStatusKey, SENSORS, sensorStatusKey } from "../sensors";

const set = (...f: TelemetryField[]) => new Set<TelemetryField>(f);
const sensor = (id: string) => {
  const found = SENSORS.find((s) => s.id === id);
  if (!found) throw new Error(id);
  return found;
};

describe("sensor status", () => {
  it("is awaiting until one of the sensor's fields has data", () => {
    expect(getSensorStatus(sensor("dht11"), set(), false)).toBe("awaiting");
    expect(getSensorStatus(sensor("dht11"), set("yaw"), false)).toBe("awaiting");
  });
  it("is online once any field has data", () => {
    expect(getSensorStatus(sensor("dht11"), set("humidity"), false)).toBe("online");
    expect(getSensorStatus(sensor("mpu6050"), set("roll"), false)).toBe("online");
  });
  it("reports GPS with data but no position fix as no-fix", () => {
    expect(getSensorStatus(sensor("gps"), set("latitude", "longitude"), false)).toBe("no-fix");
    expect(getSensorStatus(sensor("gps"), set("latitude", "longitude"), true)).toBe("online");
  });
  it("round-trips through the key used for primitive subscriptions", () => {
    const key = sensorStatusKey(set("temperature", "pressure"), false);
    expect(parseSensorStatusKey(key)).toEqual(["online", "awaiting", "online", "awaiting"]);
  });
});
