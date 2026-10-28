import { memo, useMemo } from "react";
import { Eyebrow, StatusBadge } from "@/components/ds";
import { useTelemetrySelector } from "@/telemetry/hooks";
import { NO_DATA } from "@/telemetry/format";
import { parseSensorStatusKey, SENSORS, sensorStatusKey, type SensorStatus } from "@/telemetry/sensors";
import type { Tone } from "@/design/tokens";

const statusTone: Record<SensorStatus, Tone> = { online: "ok", "no-fix": "warn", awaiting: "neutral" };
const statusText: Record<SensorStatus, string> = { online: "online", "no-fix": "no position fix", awaiting: "awaiting data" };

/**
 * Mission status strip under the top bar: per-sensor health, packet counters and signal.
 * Every value comes from the telemetry store and shows "—" when the hardware does not provide it.
 * Subscriptions use primitives so the strip re-renders only when something visible changes.
 */
export const MissionStatusBar = memo(function MissionStatusBar() {
  const statusKey = useTelemetrySelector((s) => sensorStatusKey(s.available, s.data.gpsFix));
  const packets = useTelemetrySelector((s) => s.diagnostics.received);
  const rate = useTelemetrySelector((s) => Math.round(s.diagnostics.packetsPerSecond * 10) / 10);
  const signal = useTelemetrySelector((s) => (s.available.has("signalStrength") ? s.data.signalStrength : null));
  const statuses = useMemo(() => parseSensorStatusKey(statusKey), [statusKey]);

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border bg-surface-0/70 px-4 py-2 md:px-6">
      <ul className="flex flex-wrap items-center gap-2" aria-label="Sensor status">
        {SENSORS.map((sensor, i) => {
          const status = statuses[i] ?? "awaiting";
          return (
            <li key={sensor.id}>
              <StatusBadge tone={statusTone[status]} pulse={status === "online"}>
                {sensor.label}
                <span className="sr-only">: {statusText[status]}</span>
              </StatusBadge>
            </li>
          );
        })}
      </ul>

      <dl className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-1">
        <Stat label="Packets" value={packets.toLocaleString("en-GB")} />
        <Stat label="Rate" value={`${rate.toFixed(1)}/s`} />
        <Stat label="Signal" value={signal === null ? NO_DATA : `${signal} dBm`} missing={signal === null} />
      </dl>
    </div>
  );
});

function Stat({ label, value, missing = false }: { label: string; value: string; missing?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt>
        <Eyebrow>{label}</Eyebrow>
      </dt>
      <dd className={`num text-sm ${missing ? "text-muted-foreground" : "text-foreground"}`}>
        {value}
        {missing && <span className="sr-only">No data</span>}
      </dd>
    </div>
  );
}
