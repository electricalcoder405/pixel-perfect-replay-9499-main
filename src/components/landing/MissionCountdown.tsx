import { getCountdown } from "@/app/countdown";
import { useNow } from "@/hooks/use-now";
import { fmtTime } from "@/telemetry/format";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Countdown to mission start. With no `target` it shows a placeholder until a schedule
 * is announced (set `mission.launchAt` in `src/app/mission.ts`).
 */
export function MissionCountdown({ target }: { target: Date | null }) {
  const now = useNow(target ? 1000 : 3_600_000);
  const c = getCountdown(target, now);

  const parts =
    c.state === "before"
      ? [["Days", pad(c.days)], ["Hours", pad(c.hours)], ["Min", pad(c.minutes)], ["Sec", pad(c.seconds)]]
      : [["Days", "--"], ["Hours", "--"], ["Min", "--"], ["Sec", "--"]];

  const caption =
    c.state === "unscheduled" ? "Awaiting mission schedule" : c.state === "before" ? "Until mission start" : `Mission underway · ${fmtTime(c.elapsedSeconds)}`;
  const label = c.state === "before" ? `Countdown: ${c.days} days, ${c.hours} hours, ${c.minutes} minutes, ${c.seconds} seconds` : `Countdown: ${caption}`;

  return (
    <div role="timer" aria-label={label} className="space-y-3">
      <div className="grid grid-cols-4 gap-2 text-center" aria-hidden="true">
        {parts.map(([name, value]) => (
          <div key={name} className="surface-inset px-1 py-2">
            <div className={`num text-metric-sm font-semibold ${c.state === "before" ? "text-foreground" : "text-muted-foreground"}`}>{value}</div>
            <div className="eyebrow">{name}</div>
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground">{caption}</p>
    </div>
  );
}
