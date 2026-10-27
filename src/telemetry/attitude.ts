/**
 * Normalises an angle in degrees to the range (-180, +180].
 *
 * Raw MPU6050 roll/pitch values from the hardware are unbounded (captured data
 * spans roughly -507° to +435°). Visualisation uses the normalised value; the raw
 * value is preserved separately in logs and history.
 * Non-finite input is returned unchanged so callers can reject it.
 */
export function normalizeAngle(degrees: number): number {
  if (!Number.isFinite(degrees)) return degrees;
  const wrapped = ((((degrees + 180) % 360) + 360) % 360) - 180;
  // Map -180 to +180 so the range is (-180, +180] and 180° is never shown as -180°.
  return wrapped === -180 ? 180 : wrapped;
}

/** Normalises a heading to [0, 360). */
export function normalizeHeading(degrees: number): number {
  if (!Number.isFinite(degrees)) return degrees;
  return ((degrees % 360) + 360) % 360;
}
