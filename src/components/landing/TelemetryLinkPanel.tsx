import { ConnectionIndicator, Eyebrow } from "@/components/ds";
import { useTelemetrySelector } from "@/telemetry/hooks";

/** Live link summary for the landing page: state, source and packet counters from the store. */
export function TelemetryLinkPanel() {
  const packets = useTelemetrySelector((s) => s.diagnostics.received);
  const rate = useTelemetrySelector((s) => Math.round(s.diagnostics.packetsPerSecond * 10) / 10);
  return (
    <div className="space-y-4">
      <ConnectionIndicator />
      <dl className="grid grid-cols-2 gap-3">
        <div className="surface-inset p-3">
          <dt><Eyebrow>Packets</Eyebrow></dt>
          <dd className="num text-metric-sm font-semibold text-foreground">{packets.toLocaleString("en-GB")}</dd>
        </div>
        <div className="surface-inset p-3">
          <dt><Eyebrow>Rate</Eyebrow></dt>
          <dd className="num text-metric-sm font-semibold text-foreground">{rate.toFixed(1)}<span className="ml-1 text-2xs font-normal text-muted-foreground">/s</span></dd>
        </div>
      </dl>
    </div>
  );
}
