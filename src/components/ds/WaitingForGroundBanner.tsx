import { useTelemetrySnapshot } from "@/telemetry/hooks";
import { useTelemetryMode } from "@/telemetry/config";
import { Button } from "@/components/ui/button";

/**
 * Global banner displayed in Ground Controller mode when no live packets have arrived yet.
 * Informs operators that the system is ready and listening for ESP-NOW radio telemetry,
 * without displaying any invented or mock data.
 */
export function WaitingForGroundBanner() {
  const { source, available } = useTelemetrySnapshot();
  const { isGroundController, setMode } = useTelemetryMode();

  const isWaiting = (isGroundController || source.kind === "websocket") && available.size === 0;

  if (!isWaiting) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-between rounded-lg border border-amber/30 bg-amber/10 px-4 py-3 font-mono text-xs text-amber backdrop-blur-md"
    >
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber" />
        </span>
        <span className="font-semibold uppercase tracking-wide">
          Waiting for Ground Controller...
        </span>
        <span className="text-muted-foreground hidden sm:inline">
          (Listening on {source.label} · ESP-NOW Serial Bridge)
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="quiet"
          onClick={() => setMode("demo")}
          className="h-7 px-2 font-mono text-2xs text-amber hover:text-amber border border-amber/30"
        >
          Switch to Demo Mode
        </Button>
      </div>
    </div>
  );
}
