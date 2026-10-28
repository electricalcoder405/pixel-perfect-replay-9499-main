import type { TelemetryField } from "./model";

/**
 * Maps each physical sensor to the telemetry fields it provides, so the UI can show
 * which sensors are actually delivering data. A sensor is online once any of its
 * fields has received a real value.
 *
 * `altitude` is deliberately not listed: both the BMP280 and the GPS report an
 * altitude, and which one the bridge sends is unconfirmed (to be settled in Phase 7).
 */
export interface SensorDefinition {
  readonly id: "dht11" | "mpu6050" | "bmp280" | "gps";
  readonly label: string;
  readonly fields: readonly TelemetryField[];
}

export const SENSORS: readonly SensorDefinition[] = [
  { id: "dht11", label: "DHT11", fields: ["temperature", "humidity"] },
  { id: "mpu6050", label: "MPU6050", fields: ["accelerationX", "accelerationY", "accelerationZ", "gyroX", "gyroY", "gyroZ", "roll", "pitch"] },
  { id: "bmp280", label: "BMP280", fields: ["pressure"] },
  { id: "gps", label: "GPS", fields: ["latitude", "longitude", "gpsFix"] },
];

/** online: data is arriving. no-fix: GPS is reporting but has no position fix. awaiting: nothing received yet. */
export type SensorStatus = "online" | "no-fix" | "awaiting";

export function getSensorStatus(sensor: SensorDefinition, available: ReadonlySet<TelemetryField>, gpsFix: boolean): SensorStatus {
  if (!sensor.fields.some((field) => available.has(field))) return "awaiting";
  if (sensor.id === "gps" && !gpsFix) return "no-fix";
  return "online";
}

/**
 * All sensor statuses as one string, so a component can subscribe with a primitive
 * selector (which keeps its identity between unchanged updates) and avoid re-rendering.
 */
export function sensorStatusKey(available: ReadonlySet<TelemetryField>, gpsFix: boolean): string {
  return SENSORS.map((sensor) => getSensorStatus(sensor, available, gpsFix)).join(",");
}

export function parseSensorStatusKey(key: string): SensorStatus[] {
  return key.split(",") as SensorStatus[];
}
