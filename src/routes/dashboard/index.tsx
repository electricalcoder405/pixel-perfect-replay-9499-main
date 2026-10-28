import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import {
  Activity,
  Compass,
  Cpu,
  Droplets,
  Gauge,
  RotateCw,
  Mountain,
  Navigation,
  Radio,
  Signal,
  Thermometer,
  Timer,
  Wifi,
  Hash,
  Move3d,
  LineChart as ChartIcon,
  Globe,
  Battery as BatteryIcon,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { ConnectionIndicator, PageHeader, WaitingForGroundBanner } from "@/components/ds";
import { Skeleton } from "@/components/ui/skeleton";
import { findNavItem } from "@/app/navigation";
import { pageTitle } from "@/app/mission";
import {
  Battery,
  Dial,
  Earth,
  Horizon,
  MiniChart,
  Panel,
  StatCard,
  StatusList,
  TelemetryLog,
  Vector,
} from "@/components/mission/Panels";
import { ACCEL, accelToPercent, fmtTime } from "@/lib/telemetry";
import { useTelemetrySnapshot } from "@/telemetry/hooks";
import { NO_DATA } from "@/telemetry/format";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: pageTitle("Mission Overview") },
      {
        name: "description",
        content: "Live CubeSat telemetry dashboard for the OLD MONK mission — ORBITRA'26.",
      },
    ],
  }),
  component: Overview,
});

// three.js is large and only the overview uses it, so it loads on demand.
const CubeSat = lazy(() =>
  import("@/components/mission/CubeSat").then((m) => ({ default: m.CubeSat })),
);

const I = "h-4 w-4";

function Overview() {
  const snapshot = useTelemetrySnapshot();
  const { data: d, history, available, source, connection, diagnostics } = snapshot;

  const sig = Math.max(0, Math.min(4, Math.round((d.signalStrength + 90) / 8)));
  const accel = Math.hypot(d.accelerationX, d.accelerationY, d.accelerationZ);
  const angVel = Math.hypot(d.gyroX, d.gyroY, d.gyroZ);
  const sourceLabel = source.label;

  const hasTemp = available.has("temperature");
  const hasHum = available.has("humidity");
  const hasPress = available.has("pressure");
  const hasAlt = available.has("altitude");
  const hasGps = available.has("latitude") && available.has("longitude");
  const hasAccel = available.has("accelerationX");
  const hasGyro = available.has("gyroX");
  const hasAttitude = available.has("roll") && available.has("pitch");

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Mission Control"
        title={findNavItem("overview").label}
        description={findNavItem("overview").description}
        actions={<ConnectionIndicator />}
      />

      {/* Ground Controller Waiting Banner (Displayed only when Ground Controller mode is active without packets) */}
      <WaitingForGroundBanner />

      {/* Hero row */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Panel
          title="Live Attitude · CubeSat 1U"
          icon={<Cpu className={I} />}
          className="lg:col-span-6"
        >
          <div className="relative h-[380px] md:h-[440px]">
            <Suspense
              fallback={
                <Skeleton
                  className="absolute inset-4 rounded-xl"
                  role="status"
                  aria-label="Loading 3D view"
                />
              }
            >
              <CubeSat
                roll={hasAttitude ? d.roll : 0}
                pitch={hasAttitude ? d.pitch : 0}
                yaw={available.has("yaw") ? d.yaw : 0}
              />
            </Suspense>
            <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex justify-between font-mono text-xs">
              {[
                ["ROLL", hasAttitude ? d.roll : null],
                ["PITCH", hasAttitude ? d.pitch : null],
                ["YAW", available.has("yaw") ? d.yaw : null],
              ].map(([k, v]) => (
                <div key={k as string} className="glass px-3 py-1.5">
                  <span className="text-muted-foreground">{k} </span>
                  <span className="tabular-nums text-cyan">
                    {v !== null ? `${(v as number).toFixed(1)}°` : NO_DATA}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel
          title="Artificial Horizon"
          icon={<Compass className={I} />}
          className="lg:col-span-3"
        >
          <Horizon roll={hasAttitude ? d.roll : 0} pitch={hasAttitude ? d.pitch : 0} />
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Dial label="Roll" value={hasAttitude ? d.roll : 0} max={90} />
            <Dial label="Pitch" value={hasAttitude ? d.pitch : 0} max={90} />
            <Dial label="Yaw" value={available.has("yaw") ? d.yaw : 0} max={360} />
          </div>
        </Panel>

        <div className="space-y-4 lg:col-span-3">
          <Panel title="Mission Status" icon={<ShieldCheck className={I} />}>
            <StatusList
              items={[
                {
                  label: "Mission Link",
                  ok: connection.state === "connected",
                  text: connection.state.toUpperCase(),
                },
                {
                  label: "ESP32 Transmitter",
                  ok: d.connected,
                  text: d.connected ? "ONLINE" : "WAITING",
                },
                { label: "Receiver Serial", ok: true, text: "LINKED" },
                {
                  label: "Sensors Active",
                  ok: available.size > 0,
                  text: `${Math.min(4, Math.ceil(available.size / 4))}/4`,
                },
                {
                  label: "Telemetry",
                  ok: diagnostics.received > 0,
                  text: diagnostics.received > 0 ? "STREAMING" : "IDLE",
                },
                { label: "GPS Fix", ok: d.gpsFix, text: d.gpsFix ? "3D FIX" : "SEARCH" },
              ]}
            />
          </Panel>
          <Panel title="Power System" icon={<BatteryIcon className={I} />}>
            <Battery pct={available.has("battery") ? d.battery : 85} charging={d.charging} />
          </Panel>
        </div>
      </div>

      {/* Sensor cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Temperature"
          value={hasTemp ? d.temperature.toFixed(1) : NO_DATA}
          unit={hasTemp ? "°C" : ""}
          icon={<Thermometer className={I} />}
          status={hasTemp ? "Nominal" : "Awaiting"}
          tone={hasTemp ? "ok" : "warn"}
          spark={hasTemp ? (d.temperature / 40) * 100 : 0}
        />
        <StatCard
          label="Humidity"
          value={hasHum ? d.humidity.toFixed(1) : NO_DATA}
          unit={hasHum ? "%" : ""}
          icon={<Droplets className={I} />}
          status={hasHum ? "Nominal" : "Awaiting"}
          tone={hasHum ? "ok" : "warn"}
          spark={hasHum ? d.humidity : 0}
        />
        <StatCard
          label="Pressure"
          value={hasPress ? d.pressure.toFixed(1) : NO_DATA}
          unit={hasPress ? "hPa" : ""}
          icon={<Gauge className={I} />}
          status={hasPress ? "Stable" : "Awaiting"}
          tone={hasPress ? "ok" : "warn"}
          spark={hasPress ? (d.pressure - 990) * 3 : 0}
        />
        <StatCard
          label="Est. Altitude"
          value={hasAlt ? d.altitude.toFixed(1) : NO_DATA}
          unit={hasAlt ? "m" : ""}
          icon={<Mountain className={I} />}
          status={hasAlt ? "Barometric" : "Awaiting"}
          tone="info"
          spark={hasAlt ? d.altitude : 0}
        />
        <StatCard
          label="Mission Time"
          value={fmtTime(d.missionTime).slice(2)}
          icon={<Timer className={I} />}
          status="Running"
          tone="info"
          spark={(d.missionTime % 60) / 0.6}
        />
        <StatCard
          label="GPS Latitude"
          value={hasGps ? d.latitude.toFixed(4) : NO_DATA}
          unit={hasGps ? "°N" : ""}
          icon={<Navigation className={I} />}
          status={d.gpsFix ? "3D Fix" : "Search"}
          tone={d.gpsFix ? "ok" : "warn"}
        />
        <StatCard
          label="GPS Longitude"
          value={hasGps ? d.longitude.toFixed(4) : NO_DATA}
          unit={hasGps ? "°E" : ""}
          icon={<Navigation className={I} />}
          status={d.gpsFix ? "3D Fix" : "Search"}
          tone={d.gpsFix ? "ok" : "warn"}
        />
        <StatCard
          label="Accel X"
          value={hasAccel ? d.accelerationX.toFixed(ACCEL.digits) : NO_DATA}
          unit={hasAccel ? ACCEL.label : ""}
          icon={<Move3d className={I} />}
          status="MPU6050"
          tone="info"
          spark={hasAccel ? accelToPercent(d.accelerationX) : 0}
        />
        <StatCard
          label="Accel Y"
          value={hasAccel ? d.accelerationY.toFixed(ACCEL.digits) : NO_DATA}
          unit={hasAccel ? ACCEL.label : ""}
          icon={<Move3d className={I} />}
          status="MPU6050"
          tone="info"
          spark={hasAccel ? accelToPercent(d.accelerationY) : 0}
        />
        <StatCard
          label="Accel Z"
          value={hasAccel ? d.accelerationZ.toFixed(ACCEL.digits) : NO_DATA}
          unit={hasAccel ? ACCEL.label : ""}
          icon={<Move3d className={I} />}
          status="MPU6050"
          tone="info"
          spark={hasAccel ? (accelToPercent(d.accelerationZ) - 50) * 2 : 0}
        />
        <StatCard
          label="Gyro X"
          value={hasGyro ? d.gyroX.toFixed(2) : NO_DATA}
          unit={hasGyro ? "°/s" : ""}
          icon={<RotateCw className={I} />}
          status="MPU6050"
          tone="info"
          spark={hasGyro ? 50 + d.gyroX * 5 : 0}
        />
        <StatCard
          label="Gyro Y"
          value={hasGyro ? d.gyroY.toFixed(2) : NO_DATA}
          unit={hasGyro ? "°/s" : ""}
          icon={<RotateCw className={I} />}
          status="MPU6050"
          tone="info"
          spark={hasGyro ? 50 + d.gyroY * 5 : 0}
        />
        <StatCard
          label="Gyro Z"
          value={hasGyro ? d.gyroZ.toFixed(2) : NO_DATA}
          unit={hasGyro ? "°/s" : ""}
          icon={<RotateCw className={I} />}
          status="MPU6050"
          tone="info"
          spark={hasGyro ? d.gyroZ * 8 : 0}
        />
        <StatCard
          label="Packet No."
          value={
            diagnostics.lastPacketNo !== null
              ? String(diagnostics.lastPacketNo)
              : d.packetCount > 0
                ? String(d.packetCount)
                : NO_DATA
          }
          icon={<Hash className={I} />}
          status="Checksum OK"
          spark={d.packetCount % 100}
        />
        <StatCard
          label="Connection"
          value={source.kind === "websocket" ? "ESP-NOW" : "SIMULATOR"}
          icon={<Wifi className={I} />}
          status={connection.state.toUpperCase()}
          spark={sig * 25}
        />
      </div>

      {/* Motion + GPS + Log */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Panel title="Motion Control" icon={<Activity className={I} />} className="lg:col-span-4">
          <div className="space-y-4">
            <Vector
              label={`Acceleration · |a| ${hasAccel ? accel.toFixed(ACCEL.digits) : NO_DATA} ${ACCEL.label}`}
              x={hasAccel ? d.accelerationX : 0}
              y={hasAccel ? d.accelerationY : 0}
              z={hasAccel ? d.accelerationZ : 0}
              unit=""
              scale={ACCEL.fullScale}
            />
            <Vector
              label={`Angular Velocity · |ω| ${hasGyro ? angVel.toFixed(2) : NO_DATA} °/s`}
              x={hasGyro ? d.gyroX : 0}
              y={hasGyro ? d.gyroY : 0}
              z={hasGyro ? d.gyroZ : 0}
              unit=""
              scale={10}
            />
          </div>
        </Panel>
        <Panel title="GPS Tracking" icon={<Globe className={I} />} className="lg:col-span-3">
          <div className="flex h-full items-center justify-center py-3">
            <Earth d={d} />
          </div>
        </Panel>
        <Panel title="Telemetry Log" icon={<Terminal className={I} />} className="lg:col-span-5">
          <TelemetryLog d={d} />
        </Panel>
      </div>

      {/* Charts */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Panel title="Temperature" icon={<ChartIcon className={I} />}>
          <MiniChart data={history} keys={["temperature"]} colors={["var(--amber)"]} area />
        </Panel>
        <Panel title="Pressure" icon={<ChartIcon className={I} />}>
          <MiniChart data={history} keys={["pressure"]} colors={["var(--cyan)"]} area />
        </Panel>
        <Panel title="Humidity" icon={<ChartIcon className={I} />}>
          <MiniChart data={history} keys={["humidity"]} colors={["var(--success)"]} area />
        </Panel>
        <Panel title="Acceleration" icon={<Signal className={I} />}>
          <MiniChart
            data={history}
            keys={["ax", "ay", "az"]}
            colors={["var(--amber)", "var(--cyan)", "var(--success)"]}
          />
        </Panel>
        <Panel title="Angular Velocity" icon={<Radio className={I} />}>
          <MiniChart
            data={history}
            keys={["gx", "gy", "gz"]}
            colors={["var(--amber)", "var(--cyan)", "var(--success)"]}
          />
        </Panel>
      </div>

      <p className="pb-2 text-center eyebrow text-2xs text-muted-foreground">
        OLD MONK · ORBITRA'26 · Active Source: {sourceLabel} · Protocol: ESP-NOW/Serial Bridge
      </p>
    </div>
  );
}
