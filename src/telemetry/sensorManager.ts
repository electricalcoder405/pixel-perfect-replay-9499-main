import type { TelemetryField } from "./model";
import { SENSORS, type SensorDefinition } from "./sensors";

/** awaiting: nothing received yet. ok: reporting. degraded: reporting but unusable (GPS without fix). offline: stopped reporting. */
export type SensorHealth = "ok" | "degraded" | "offline" | "awaiting";

export interface SensorState {
  readonly id: SensorDefinition["id"];
  readonly label: string;
  /** True once the sensor has delivered at least one real value. */
  readonly available: boolean;
  /** Wall-clock ms of the newest value from this sensor, or null. */
  readonly lastUpdate: number | null;
  readonly health: SensorHealth;
  /** Current problems; empty when healthy. */
  readonly errors: readonly string[];
}

/** A sensor that has not reported for this long is offline. */
export const SENSOR_TIMEOUT_MS = 5_000;

export function evaluateSensors(
  available: ReadonlySet<TelemetryField>,
  updatedAt: Readonly<Partial<Record<TelemetryField, number>>>,
  gpsFix: boolean,
  now: number,
  timeoutMs = SENSOR_TIMEOUT_MS,
): SensorState[] {
  return SENSORS.map((sensor): SensorState => {
    const isAvailable = sensor.fields.some((f) => available.has(f));
    let lastUpdate: number | null = null;
    for (const field of sensor.fields) {
      const at = updatedAt[field];
      if (at !== undefined && (lastUpdate === null || at > lastUpdate)) lastUpdate = at;
    }
    if (!isAvailable) return { id: sensor.id, label: sensor.label, available: false, lastUpdate, health: "awaiting", errors: [] };

    if (lastUpdate !== null && now - lastUpdate > timeoutMs) {
      const seconds = Math.round((now - lastUpdate) / 1000);
      return { id: sensor.id, label: sensor.label, available: true, lastUpdate, health: "offline", errors: [`No data for ${seconds} s`] };
    }
    if (sensor.id === "gps" && !gpsFix) {
      return { id: sensor.id, label: sensor.label, available: true, lastUpdate, health: "degraded", errors: ["No GPS fix"] };
    }
    return { id: sensor.id, label: sensor.label, available: true, lastUpdate, health: "ok", errors: [] };
  });
}

/** Compact identity of a sensor list, used to keep array identity stable between unchanged ticks. */
export function sensorSignature(sensors: readonly SensorState[]): string {
  return sensors.map((s) => `${s.id}:${s.health}:${s.lastUpdate ?? ""}:${s.errors.join("|")}`).join(";");
}
