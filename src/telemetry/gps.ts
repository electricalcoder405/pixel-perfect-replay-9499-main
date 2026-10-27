/**
 * Decides whether a GPS reading is a usable position fix.
 *
 * The receiver reports latitude = 0 and longitude = 0 while it has no fix, so a
 * (0, 0) position is always treated as "No GPS Fix" and must never be plotted.
 * `fixFlag` is the receiver's own fix indication when it provides one.
 */
export function hasValidGpsFix(latitude: number, longitude: number, fixFlag?: boolean): boolean {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude === 0 && longitude === 0) return false;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return false;
  return fixFlag ?? true;
}
