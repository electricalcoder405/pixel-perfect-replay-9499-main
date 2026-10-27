/** Text shown in place of a value the hardware has not provided. */
export const NO_DATA = "—";

/** Formats mission elapsed time as T+HH:MM:SS. */
export const fmtTime = (s: number) =>
  `T+${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Formats a number with fixed decimals, or NO_DATA when it is missing or not finite. */
export function formatValue(value: number | null | undefined, digits = 1): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : NO_DATA;
}
