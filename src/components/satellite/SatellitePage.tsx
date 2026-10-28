import {
  Globe2,
  Orbit,
  RotateCcw,
  Satellite as SatelliteIcon,
  Compass,
  Timer,
  Radio,
} from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { findNavItem } from "@/app/navigation";
import {
  ConnectionIndicator,
  MetricValue,
  PageHeader,
  StatusBadge,
  WaitingForGroundBanner,
  Widget,
  WidgetGrid,
  WidgetSkeleton,
} from "@/components/ds";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";
import type { Tone } from "@/design/tokens";
import { fmtTime, formatValue, NO_DATA } from "@/telemetry/format";
import { useTelemetrySnapshot } from "@/telemetry/hooks";
import type { MissionStatus } from "@/telemetry/missionState";
import { ArtificialHorizon } from "./ArtificialHorizon";
import { AttitudeMeter } from "./AttitudeMeter";
import type { SceneMode } from "./SatelliteScene";
import { YawCompass } from "./YawCompass";

// three.js is large; load it only when this page opens.
const SatelliteScene = lazy(() =>
  import("./SatelliteScene").then((m) => ({ default: m.SatelliteScene })),
);

const MISSION_TONE: Record<MissionStatus, Tone> = {
  standby: "neutral",
  active: "ok",
  degraded: "warn",
  "link-lost": "crit",
};
const MISSION_LABEL: Record<MissionStatus, string> = {
  standby: "Standby",
  active: "Active",
  degraded: "Degraded",
  "link-lost": "Link lost",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 py-2 last:border-b-0">
      <dt className="eyebrow">{label}</dt>
      <dd className="num text-sm text-foreground">{children}</dd>
    </div>
  );
}

/** Satellite module: live 3D attitude, orbit context, horizon and link/mission status. */
export function SatellitePage() {
  const item = findNavItem("satellite");
  const snapshot = useTelemetrySnapshot();
  const now = useNow(1000);
  const [mode, setMode] = useState<SceneMode>("orbit");
  const [resetKey, setResetKey] = useState(0);

  const { data, available, mission, diagnostics, connection, source } = snapshot;
  const hasAttitude = available.has("roll") && available.has("pitch");
  const hasYaw = available.has("yaw");
  const attitude = {
    roll: hasAttitude ? data.roll : 0,
    pitch: hasAttitude ? data.pitch : 0,
    yaw: hasYaw ? data.yaw : 0,
  };

  // Prefer the spacecraft's own mission clock; otherwise time since the first packet reached the dashboard.
  const hasDeviceClock = available.has("missionTime");
  const running = mission.status === "active" || mission.status === "degraded";
  const elapsedMs =
    mission.startTime === null
      ? null
      : running
        ? Math.max(0, now.getTime() - mission.startTime)
        : mission.durationMs;
  const timer = hasDeviceClock
    ? fmtTime(data.missionTime)
    : elapsedMs === null
      ? NO_DATA
      : fmtTime(Math.floor(elapsedMs / 1000));

  const lastAgeS =
    snapshot.lastUpdated === null
      ? null
      : Math.max(0, Math.round((now.getTime() - snapshot.lastUpdated) / 1000));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module"
        title={item.label}
        description={item.description}
        actions={<ConnectionIndicator />}
      />

      <WaitingForGroundBanner />

      <WidgetGrid>
        <Widget
          title="3D attitude"
          icon={<SatelliteIcon className="h-4 w-4" />}
          span="twoThirds"
          bodyClassName="p-0"
          actions={
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant={mode === "orbit" ? "brand" : "quiet"}
                aria-pressed={mode === "orbit"}
                onClick={() => setMode("orbit")}
              >
                <Orbit /> Orbit
              </Button>
              <Button
                size="sm"
                variant={mode === "attitude" ? "brand" : "quiet"}
                aria-pressed={mode === "attitude"}
                onClick={() => setMode("attitude")}
              >
                <Globe2 /> Attitude
              </Button>
              <Button
                size="sm"
                variant="quiet"
                onClick={() => setResetKey((k) => k + 1)}
                aria-label="Reset camera"
              >
                <RotateCcw />
              </Button>
            </div>
          }
        >
          <div className="relative h-[360px] w-full md:h-[520px]">
            <Suspense
              fallback={
                <div className="p-4">
                  <WidgetSkeleton lines={4} />
                </div>
              }
            >
              <SatelliteScene attitude={attitude} mode={mode} resetKey={resetKey} />
            </Suspense>
            <dl className="num pointer-events-none absolute left-3 top-3 space-y-0.5 rounded-md border border-border bg-background/70 px-3 py-2 text-xs backdrop-blur">
              <div className="flex gap-3">
                <dt className="text-muted-foreground">ROLL</dt>
                <dd className="ml-auto">{formatValue(hasAttitude ? data.roll : null)}°</dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-muted-foreground">PITCH</dt>
                <dd className="ml-auto">{formatValue(hasAttitude ? data.pitch : null)}°</dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-muted-foreground">YAW</dt>
                <dd className="ml-auto">{formatValue(hasYaw ? data.yaw : null)}°</dd>
              </div>
            </dl>
            <p className="pointer-events-none absolute bottom-2 left-3 text-2xs text-muted-foreground">
              Drag to rotate · scroll to zoom ·{" "}
              {mode === "orbit"
                ? "Orbit path is illustrative"
                : "Axes: X amber · Y cyan · Z purple"}
            </p>
            {!hasAttitude && (
              <p className="pointer-events-none absolute bottom-2 right-3 rounded-full border border-border bg-background/70 px-3 py-1 text-2xs text-amber animate-pulse">
                {source.kind === "websocket"
                  ? "Waiting for Ground Controller attitude..."
                  : "Awaiting attitude telemetry"}
              </p>
            )}
          </div>
        </Widget>

        <Widget title="Artificial horizon" icon={<Compass className="h-4 w-4" />} span="third">
          <div className="mx-auto aspect-square w-full max-w-[300px]">
            <ArtificialHorizon roll={data.roll} pitch={data.pitch} available={hasAttitude} />
          </div>
        </Widget>

        <Widget title="Attitude" icon={<Compass className="h-4 w-4" />} span="third">
          <div className="grid grid-cols-[1fr_auto] items-center gap-4">
            <div className="space-y-4">
              <AttitudeMeter label="Roll" value={data.roll} available={hasAttitude} />
              <AttitudeMeter label="Pitch" value={data.pitch} available={hasAttitude} />
              <AttitudeMeter label="Yaw" value={data.yaw} available={hasYaw} />
            </div>
            <div className="h-28 w-28">
              <YawCompass yaw={data.yaw} available={hasYaw} />
            </div>
          </div>
          {hasAttitude && (
            <p className="mt-3 text-2xs text-muted-foreground">
              Raw receiver values: roll {formatValue(data.rollRaw)}° · pitch{" "}
              {formatValue(data.pitchRaw)}°
            </p>
          )}
        </Widget>

        <Widget
          title="Mission"
          icon={<Timer className="h-4 w-4" />}
          span="third"
          status={
            <StatusBadge tone={MISSION_TONE[mission.status]} pulse={mission.status === "active"}>
              {MISSION_LABEL[mission.status]}
            </StatusBadge>
          }
        >
          <p
            className="text-metric-md num font-semibold text-amber"
            aria-label="Mission elapsed time"
          >
            {timer}
          </p>
          <dl className="mt-3">
            <Row label="Packets received">
              <MetricValue value={mission.packetCount} digits={0} size="sm" />
            </Row>
            <Row label="Last packet #">
              <MetricValue
                value={diagnostics.lastPacketNo}
                digits={0}
                size="sm"
                available={diagnostics.lastPacketNo !== null}
              />
            </Row>
            <Row label="Missed">
              {diagnostics.missed}{" "}
              <span className="text-2xs text-muted-foreground">
                ({diagnostics.lossPercent.toFixed(1)}%)
              </span>
            </Row>
            <Row label="Last packet">{lastAgeS === null ? NO_DATA : `${lastAgeS} s ago`}</Row>
          </dl>
        </Widget>

        <Widget
          title="Connection"
          icon={<Radio className="h-4 w-4" />}
          span="full"
          status={<ConnectionIndicator />}
        >
          <dl className="grid gap-x-8 sm:grid-cols-2 xl:grid-cols-4">
            <Row label="Link detail">{connection.detail ?? NO_DATA}</Row>
            <Row label="Update rate">
              {diagnostics.packetsPerSecond > 0
                ? `${diagnostics.packetsPerSecond.toFixed(1)} /s`
                : NO_DATA}
            </Row>
            <Row label="Signal">
              {available.has("signalStrength")
                ? `${formatValue(data.signalStrength, 0)} dBm`
                : NO_DATA}
            </Row>
            <Row label="Invalid packets">{diagnostics.invalid}</Row>
          </dl>
        </Widget>
      </WidgetGrid>
    </div>
  );
}
