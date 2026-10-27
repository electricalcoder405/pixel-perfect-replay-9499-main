/**
 * Display units for telemetry values whose unit is not yet confirmed by firmware.
 *
 * The MPU6050 acceleration unit is unconfirmed (captured hardware data peaks near
 * ±1.5, which looks like g). To change it, edit ACCEL_UNIT below — nothing else.
 */
export type AccelUnit = "g" | "m/s²";

export interface AccelUnitConfig {
  /** Label shown next to the value. */
  readonly label: AccelUnit;
  /** Value of 1 g expressed in this unit (used by the simulator). */
  readonly gravity: number;
  /** Value that fills a gauge or bar to its end (gauges clamp beyond this). */
  readonly fullScale: number;
  /** Decimal places to display. */
  readonly digits: number;
}

export const ACCEL_UNITS: Readonly<Record<AccelUnit, AccelUnitConfig>> = {
  g: { label: "g", gravity: 1, fullScale: 1, digits: 3 },
  "m/s²": { label: "m/s²", gravity: 9.80665, fullScale: 10, digits: 2 },
};

/** The unit currently used for every acceleration value in the dashboard. */
export const ACCEL_UNIT: AccelUnit = "g";

export const ACCEL: AccelUnitConfig = ACCEL_UNITS[ACCEL_UNIT];

/** Maps an acceleration value to a 0–100 gauge position centred on 50. */
export function accelToPercent(value: number, config: AccelUnitConfig = ACCEL): number {
  return 50 + (value / config.fullScale) * 50;
}
