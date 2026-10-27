/**
 * Compatibility facade.
 *
 * The telemetry implementation now lives in `src/telemetry/`. This file keeps the
 * original import path and the original `useTelemetry()` shape working, so existing
 * components need no changes.
 */
import { useTelemetrySnapshot } from "../telemetry/hooks";
import type { HistoryPoint } from "../telemetry/model";

export type { HistoryPoint, Telemetry } from "../telemetry/model";
export { initialTelemetry } from "../telemetry/model";
export { altitudeFromPressure, simulate } from "../telemetry/simulator";
export { fmtTime } from "../telemetry/format";
export { ACCEL, accelToPercent } from "../telemetry/units";

/** Original hook shape: current values plus recent history. Must be used under <TelemetryProvider>. */
export function useTelemetry() {
  const { data, history } = useTelemetrySnapshot();
  // Existing chart components take a mutable array type; they never mutate it.
  return { data, history: history as HistoryPoint[] };
}
