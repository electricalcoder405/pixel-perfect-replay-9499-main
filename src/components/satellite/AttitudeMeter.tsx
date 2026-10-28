import { MetricValue } from "@/components/ds";
import { cn } from "@/lib/utils";

/** One attitude axis: label, value in degrees and a bar showing where it sits in ±180°. */
export function AttitudeMeter({
  label,
  value,
  available,
  className,
}: {
  label: string;
  value: number;
  available: boolean;
  className?: string;
}) {
  const clamped = Math.max(-180, Math.min(180, Number.isFinite(value) ? value : 0));
  const position = ((clamped + 180) / 360) * 100;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="eyebrow">{label}</span>
        <MetricValue value={value} unit="°" digits={1} available={available} size="sm" />
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={-180}
        aria-valuemax={180}
        aria-valuenow={available ? Math.round(clamped) : 0}
        aria-valuetext={available ? `${clamped.toFixed(1)} degrees` : "No data"}
        className="relative h-1.5 rounded-full bg-muted"
      >
        <span className="absolute left-1/2 top-[-3px] h-3 w-px bg-border" aria-hidden="true" />
        {available && (
          <span
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]"
            style={{ left: `${position}%` }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
