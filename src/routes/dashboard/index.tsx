import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Activity, Compass, Cpu, Droplets, Gauge, RotateCw, Mountain, Navigation, Radio, Signal, Thermometer, Timer, Wifi, Hash, Move3d, LineChart as ChartIcon, Globe, Battery as BatteryIcon, ShieldCheck, Terminal } from "lucide-react";
import { PageHeader } from "@/components/ds";
import { Skeleton } from "@/components/ui/skeleton";
import { findNavItem } from "@/app/navigation";
import { pageTitle } from "@/app/mission";
import { Battery, Dial, Earth, Horizon, MiniChart, Panel, StatCard, StatusList, TelemetryLog, Vector } from "@/components/mission/Panels";
import { ACCEL, accelToPercent, fmtTime, useTelemetry } from "@/lib/telemetry";
import { useTelemetrySelector } from "@/telemetry/hooks";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: pageTitle("Mission Overview") },
      { name: "description", content: "Live CubeSat telemetry dashboard for the OLD MONK mission — ORBITRA'26." },
    ],
  }),
  component: Overview,
});

// three.js is large and only the overview uses it, so it loads on demand.
const CubeSat = lazy(() => import("@/components/mission/CubeSat").then((m) => ({ default: m.CubeSat })));

const I = "h-4 w-4";

function Overview() {
  const { data: d, history } = useTelemetry();
  const sig = Math.max(0, Math.min(4, Math.round((d.signalStrength + 90) / 8)));
  const accel = Math.hypot(d.accelerationX, d.accelerationY, d.accelerationZ);
  const angVel = Math.hypot(d.gyroX, d.gyroY, d.gyroZ);
  const sourceLabel = useTelemetrySelector((s) => s.source.label);

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Live" title={findNavItem("overview").label} description={findNavItem("overview").description} />

      {/* Hero row */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Panel title="Live Attitude · CubeSat 1U" icon={<Cpu className={I} />} className="lg:col-span-6">
          <div className="relative h-[380px] md:h-[440px]">
            <div className="absolute inset-0 rounded-full bg-cyan/10 blur-3xl" />
            <Suspense fallback={<Skeleton className="absolute inset-4 rounded-xl" role="status" aria-label="Loading 3D view" />}>
              <CubeSat roll={d.roll} pitch={d.pitch} yaw={d.yaw} />
            </Suspense>
            <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex justify-between font-mono text-xs">
              {[["ROLL", d.roll], ["PITCH", d.pitch], ["YAW", d.yaw]].map(([k, v]) => (
                <div key={k as string} className="glass px-3 py-1.5"><span className="text-muted-foreground">{k} </span><span className="tabular-nums text-cyan">{(v as number).toFixed(1)}°</span></div>
              ))}
            </div>
          </div>
        </Panel>
        <Panel title="Artificial Horizon" icon={<Compass className={I} />} className="lg:col-span-3">
          <Horizon roll={d.roll} pitch={d.pitch} />
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Dial label="Roll" value={d.roll} max={90} /><Dial label="Pitch" value={d.pitch} max={90} /><Dial label="Yaw" value={d.yaw} max={360} />
          </div>
        </Panel>
        <div className="space-y-4 lg:col-span-3">
          <Panel title="Mission Status" icon={<ShieldCheck className={I} />}>
            <StatusList items={[
              { label: "Mission", ok: true, text: "NOMINAL" },
              { label: "ESP32 Transmitter", ok: d.connected, text: "ONLINE" },
              { label: "Receiver", ok: true, text: "LINKED" },
              { label: "Sensors", ok: true, text: "4/4" },
              { label: "Telemetry", ok: true, text: "ACTIVE" },
              { label: "GPS", ok: d.gpsFix, text: d.gpsFix ? "FIX" : "SEARCH" },
            ]} />
          </Panel>
          <Panel title="Power" icon={<BatteryIcon className={I} />}><Battery pct={d.battery} charging={d.charging} /></Panel>
        </div>
      </div>

      {/* Sensor cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Temperature" value={d.temperature.toFixed(1)} unit="°C" icon={<Thermometer className={I} />} status="Nominal" spark={(d.temperature / 40) * 100} />
        <StatCard label="Humidity" value={d.humidity.toFixed(1)} unit="%" icon={<Droplets className={I} />} status="Nominal" spark={d.humidity} />
        <StatCard label="Pressure" value={d.pressure.toFixed(1)} unit="hPa" icon={<Gauge className={I} />} status="Stable" spark={(d.pressure - 990) * 3} />
        <StatCard label="Est. Altitude" value={d.altitude.toFixed(1)} unit="m" icon={<Mountain className={I} />} status="Baro" tone="info" spark={d.altitude} />
        <StatCard label="Mission Time" value={fmtTime(d.missionTime).slice(2)} icon={<Timer className={I} />} status="Running" tone="info" spark={(d.missionTime % 60) / 0.6} />
        <StatCard label="GPS Latitude" value={d.latitude.toFixed(4)} unit="°N" icon={<Navigation className={I} />} status={d.gpsFix ? "Fix" : "Search"} tone={d.gpsFix ? "ok" : "warn"} />
        <StatCard label="GPS Longitude" value={d.longitude.toFixed(4)} unit="°E" icon={<Navigation className={I} />} status={d.gpsFix ? "Fix" : "Search"} tone={d.gpsFix ? "ok" : "warn"} />
        <StatCard label="Accel X" value={d.accelerationX.toFixed(ACCEL.digits)} unit={ACCEL.label} icon={<Move3d className={I} />} status="MPU6050" tone="info" spark={accelToPercent(d.accelerationX)} />
        <StatCard label="Accel Y" value={d.accelerationY.toFixed(ACCEL.digits)} unit={ACCEL.label} icon={<Move3d className={I} />} status="MPU6050" tone="info" spark={accelToPercent(d.accelerationY)} />
        <StatCard label="Accel Z" value={d.accelerationZ.toFixed(ACCEL.digits)} unit={ACCEL.label} icon={<Move3d className={I} />} status="MPU6050" tone="info" spark={(accelToPercent(d.accelerationZ) - 50) * 2} />
        <StatCard label="Gyro X" value={d.gyroX.toFixed(2)} unit="°/s" icon={<RotateCw className={I} />} status="MPU6050" tone="info" spark={50 + d.gyroX * 5} />
        <StatCard label="Gyro Y" value={d.gyroY.toFixed(2)} unit="°/s" icon={<RotateCw className={I} />} status="MPU6050" tone="info" spark={50 + d.gyroY * 5} />
        <StatCard label="Gyro Z" value={d.gyroZ.toFixed(2)} unit="°/s" icon={<RotateCw className={I} />} status="MPU6050" tone="info" spark={d.gyroZ * 8} />
        <StatCard label="Packet No." value={String(d.packetCount)} icon={<Hash className={I} />} status="Checksum OK" spark={(d.packetCount % 100)} />
        <StatCard label="Connection" value="ESP-NOW" icon={<Wifi className={I} />} status="Connected" spark={sig * 25} />
      </div>

      {/* Motion + GPS + Log */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Panel title="Motion Control" icon={<Activity className={I} />} className="lg:col-span-4">
          <div className="space-y-4">
            <Vector label={`Acceleration · |a| ${accel.toFixed(ACCEL.digits)} ${ACCEL.label}`} x={d.accelerationX} y={d.accelerationY} z={d.accelerationZ} unit="" scale={ACCEL.fullScale} />
            <Vector label={`Angular Velocity · |ω| ${angVel.toFixed(2)} °/s`} x={d.gyroX} y={d.gyroY} z={d.gyroZ} unit="" scale={10} />
          </div>
        </Panel>
        <Panel title="GPS Tracking" icon={<Globe className={I} />} className="lg:col-span-3"><div className="flex h-full items-center justify-center py-3"><Earth d={d} /></div></Panel>
        <Panel title="Telemetry Log" icon={<Terminal className={I} />} className="lg:col-span-5"><TelemetryLog d={d} /></Panel>
      </div>

      {/* Charts */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Panel title="Temperature" icon={<ChartIcon className={I} />}><MiniChart data={history} keys={["temperature"]} colors={["var(--amber)"]} area /></Panel>
        <Panel title="Pressure" icon={<ChartIcon className={I} />}><MiniChart data={history} keys={["pressure"]} colors={["var(--cyan)"]} area /></Panel>
        <Panel title="Humidity" icon={<ChartIcon className={I} />}><MiniChart data={history} keys={["humidity"]} colors={["var(--success)"]} area /></Panel>
        <Panel title="Acceleration" icon={<Signal className={I} />}><MiniChart data={history} keys={["ax", "ay", "az"]} colors={["var(--amber)", "var(--cyan)", "var(--success)"]} /></Panel>
        <Panel title="Angular Velocity" icon={<Radio className={I} />}><MiniChart data={history} keys={["gx", "gy", "gz"]} colors={["var(--amber)", "var(--cyan)", "var(--success)"]} /></Panel>
      </div>

      <p className="pb-2 text-center eyebrow">Old Monk · ORBITRA'26 · Source: {sourceLabel}</p>
    </div>
  );
}
