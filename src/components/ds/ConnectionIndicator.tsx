import { cn } from "@/lib/utils";
import { CONNECTION_META } from "@/telemetry/connection";
import { useTelemetrySelector } from "@/telemetry/hooks";
import { StatusBadge } from "./StatusBadge";

/** Shows the active telemetry source and the state of its link. Safe to place in any header. */
export function ConnectionIndicator({ showSource = true, sourceClassName, className }: { showSource?: boolean; sourceClassName?: string; className?: string }) {
  const connection = useTelemetrySelector((s) => s.connection);
  const source = useTelemetrySelector((s) => s.source);
  const meta = CONNECTION_META[connection.state];
  return (
    <div className={cn("inline-flex items-center gap-2", className)} role="status" aria-live="polite" title={connection.detail ?? meta.description}>
      <StatusBadge tone={meta.tone} pulse={meta.live}>
        {meta.label}
      </StatusBadge>
      {showSource && <span className={cn("eyebrow", sourceClassName)}>{source.label}</span>}
      <span className="sr-only">{meta.description}</span>
    </div>
  );
}
