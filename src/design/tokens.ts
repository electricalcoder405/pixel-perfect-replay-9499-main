/**
 * Design-system constants for use in TypeScript.
 * Earth Blue + Space Black Palette.
 */

/** Semantic meaning of a status colour. */
export type Tone = "ok" | "info" | "warn" | "crit" | "neutral" | "accent";

/** Text colour class for each tone. */
export const toneText: Readonly<Record<Tone, string>> = {
  ok: "text-success",
  info: "text-cyan",
  warn: "text-warning",
  crit: "text-critical",
  neutral: "text-muted-foreground",
  accent: "text-amber",
};

/** Soft background + border classes for badges and chips. */
export const toneSurface: Readonly<Record<Tone, string>> = {
  ok: "bg-success/10 border-success/30 text-success",
  info: "bg-cyan/10 border-cyan/30 text-cyan",
  warn: "bg-warning/10 border-warning/30 text-warning",
  crit: "bg-critical/10 border-critical/30 text-critical",
  neutral: "bg-muted/60 border-border text-muted-foreground",
  accent: "bg-amber/10 border-amber/30 text-amber",
};

/** CSS variable references & hex fallbacks for chart and SVG colours (Recharts, canvas, three.js). */
export const chartColors = {
  amber: "#1D7CF2",
  copper: "#31C8FF",
  cyan: "#31C8FF",
  purple: "#818cf8",
  success: "#22C55E",
  warning: "#FACC15",
  critical: "#EF4444",
  muted: "var(--muted-foreground)",
  grid: "var(--border)",
} as const;

/** Default colour order for multi-series charts in Earth Blue palette. */
export const seriesPalette = [
  chartColors.amber,
  chartColors.cyan,
  chartColors.purple,
  chartColors.copper,
  chartColors.success,
] as const;
