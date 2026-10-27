/**
 * Design-system constants for use in TypeScript.
 * The colour values themselves live in `styles.css`; this file only names them.
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

/** CSS variable references for chart and SVG colours (Recharts, canvas, three.js). */
export const chartColors = {
  amber: "var(--amber)",
  copper: "var(--copper)",
  cyan: "var(--cyan)",
  purple: "var(--purple)",
  success: "var(--success)",
  warning: "var(--warning)",
  critical: "var(--critical)",
  muted: "var(--muted-foreground)",
  grid: "var(--border)",
} as const;

/** Default colour order for multi-series charts. */
export const seriesPalette = [
  chartColors.amber,
  chartColors.cyan,
  chartColors.purple,
  chartColors.copper,
  chartColors.success,
] as const;
