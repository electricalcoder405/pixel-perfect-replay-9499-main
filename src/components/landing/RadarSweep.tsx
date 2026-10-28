import { cn } from "@/lib/utils";

/**
 * Ground-station radar. The sweep means "the receiver is listening"; the blip appears
 * only when a telemetry link is live, so the graphic reflects real state.
 */
export function RadarSweep({ live, className }: { live: boolean; className?: string }) {
  return (
    <div
      role="img"
      aria-label={
        live
          ? "Ground station radar: satellite link acquired"
          : "Ground station radar: searching for signal"
      }
      className={cn(
        "relative mx-auto aspect-square w-full max-w-[200px] overflow-hidden rounded-full border border-cyan/30 bg-surface-0",
        className,
      )}
    >
      {[0, 22, 44].map((inset) => (
        <span
          key={inset}
          aria-hidden="true"
          className="absolute rounded-full border border-cyan/15"
          style={{ inset: `${inset}%` }}
        />
      ))}
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-cyan/15"
      />
      <span
        aria-hidden="true"
        className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-cyan/15"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full animate-[spin-slow_5s_linear_infinite]"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg 285deg, color-mix(in oklab, var(--cyan) 38%, transparent) 360deg)",
        }}
      />
      {live && (
        <span
          aria-hidden="true"
          className="absolute left-[64%] top-[28%] h-2 w-2 rounded-full bg-success shadow-[0_0_8px_var(--success)]"
        />
      )}
    </div>
  );
}
