import { Eyebrow } from "@/components/ds";
import { fmtTime, NO_DATA } from "@/telemetry/format";
import { useTelemetrySelector } from "@/telemetry/hooks";

/** Mission elapsed time. Shows "—" when the active source does not provide it. */
export function MissionTimer() {
  const seconds = useTelemetrySelector((s) => s.data.missionTime);
  const available = useTelemetrySelector((s) => s.available.has("missionTime"));
  return (
    <div className="leading-tight">
      <Eyebrow>Mission</Eyebrow>
      <p className="num text-sm text-amber">
        {available ? fmtTime(seconds) : NO_DATA}
        {!available && <span className="sr-only">No data</span>}
      </p>
    </div>
  );
}
