import { cn } from "@/lib/utils";
import { NO_DATA } from "@/telemetry/format";

type MetricSize = "sm" | "md" | "lg";

const sizeClass: Record<MetricSize, string> = {
  sm: "text-metric-sm font-bold tracking-tight",
  md: "text-metric-md font-bold tracking-tight",
  lg: "text-metric-lg font-bold tracking-tight",
};

export interface MetricValueProps {
  value: number | string | null | undefined;
  unit?: string;
  /** Decimal places when `value` is a number. */
  digits?: number;
  /** Set false when the hardware has not provided this value. Shows "—" instead of a number. */
  available?: boolean;
  size?: MetricSize;
  className?: string;
}

/**
 * A telemetry reading with its unit. Missing values render as "—" and are announced
 * as "No data", so a stale or absent reading is never mistaken for zero.
 */
export function MetricValue({
  value,
  unit,
  digits = 1,
  available = true,
  size = "md",
  className,
}: MetricValueProps) {
  const missing =
    !available ||
    value === null ||
    value === undefined ||
    (typeof value === "number" && !Number.isFinite(value));
  const text = missing
    ? NO_DATA
    : typeof value === "number"
      ? value.toFixed(digits)
      : String(value);
  return (
    <span
      className={cn(
        "num inline-flex items-baseline gap-1 font-mono text-foreground tabular-nums select-all",
        sizeClass[size],
        missing && "text-muted-foreground font-normal",
        className,
      )}
    >
      <span aria-hidden={missing || undefined}>{text}</span>
      {missing && <span className="sr-only">No data</span>}
      {unit && !missing && (
        <span className="text-2xs font-sans font-medium uppercase tracking-wider text-muted-foreground/80">
          {unit}
        </span>
      )}
    </span>
  );
}
