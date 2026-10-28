import {
  Activity,
  Compass,
  Cpu,
  Droplets,
  Gauge,
  Globe,
  Mountain,
  Navigation,
  RotateCw,
  Signal,
  Thermometer,
} from "lucide-react";
import {
  ConnectionIndicator,
  PageHeader,
  StatusBadge,
  WaitingForGroundBanner,
  Widget,
  WidgetGrid,
} from "@/components/ds";
import { formatValue, NO_DATA } from "@/telemetry/format";
import { useTelemetrySnapshot } from "@/telemetry/hooks";
import { ACCEL } from "@/telemetry/units";
import { useNow } from "@/hooks/use-now";

export function SensorsPage() {
  const snapshot = useTelemetrySnapshot();
  const now = useNow(1000);

  const { data, available, updatedAt, sensors } = snapshot;

  const dht11State = sensors.find((s) => s.id === "dht11");
  const bmp280State = sensors.find((s) => s.id === "bmp280");
  const mpu6050State = sensors.find((s) => s.id === "mpu6050");
  const gpsState = sensors.find((s) => s.id === "gps");

  const getAge = (field: keyof typeof data) => {
    const at = updatedAt[field];
    return at ? `${Math.max(0, Math.round((now.getTime() - at) / 1000))}s ago` : "Awaiting data";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Instruments"
        title="Physical Sensor Subsystems"
        description="Live hardware instrumentation telemetry from the DHT11, BMP280, MPU6050, and GPS sensors."
        actions={<ConnectionIndicator />}
      />

      <WaitingForGroundBanner />

      <WidgetGrid>
        {/* DHT11 Sensor */}
        <Widget
          title="DHT11 · Ambient Climate Sensor"
          icon={<Thermometer className="h-4 w-4" />}
          span="half"
          status={
            <StatusBadge tone={dht11State?.health === "ok" ? "ok" : "warn"}>
              {dht11State?.health.toUpperCase() ?? "AWAITING"}
            </StatusBadge>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-md border border-border bg-surface-1 p-3">
                <span className="eyebrow text-2xs flex items-center gap-1.5 text-muted-foreground">
                  <Thermometer className="h-3.5 w-3.5 text-amber" /> Temperature
                </span>
                <div className="mt-1 font-mono text-2xl font-bold text-foreground">
                  {available.has("temperature") ? `${data.temperature.toFixed(1)} °C` : NO_DATA}
                </div>
                <div className="text-2xs font-mono text-muted-foreground mt-1">
                  Updated {getAge("temperature")}
                </div>
              </div>

              <div className="rounded-md border border-border bg-surface-1 p-3">
                <span className="eyebrow text-2xs flex items-center gap-1.5 text-muted-foreground">
                  <Droplets className="h-3.5 w-3.5 text-cyan" /> Relative Humidity
                </span>
                <div className="mt-1 font-mono text-2xl font-bold text-foreground">
                  {available.has("humidity") ? `${data.humidity.toFixed(1)} %` : NO_DATA}
                </div>
                <div className="text-2xs font-mono text-muted-foreground mt-1">
                  Updated {getAge("humidity")}
                </div>
              </div>
            </div>

            <dl className="space-y-1.5 text-xs font-mono border-t border-border/60 pt-3">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Interface Bus:</dt>
                <dd className="text-foreground">Single-wire digital protocol (GPIO 4)</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Rated Range:</dt>
                <dd className="text-foreground">0–50 °C (±2 °C) / 20–90% RH (±5%)</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Diagnostics:</dt>
                <dd className="text-success">
                  {dht11State?.errors.length ? dht11State.errors.join(", ") : "Normal Operation"}
                </dd>
              </div>
            </dl>
          </div>
        </Widget>

        {/* BMP280 Sensor */}
        <Widget
          title="BMP280 · Barometric Pressure & Altimeter"
          icon={<Gauge className="h-4 w-4" />}
          span="half"
          status={
            <StatusBadge tone={bmp280State?.health === "ok" ? "ok" : "warn"}>
              {bmp280State?.health.toUpperCase() ?? "AWAITING"}
            </StatusBadge>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-md border border-border bg-surface-1 p-3">
                <span className="eyebrow text-2xs flex items-center gap-1.5 text-muted-foreground">
                  <Gauge className="h-3.5 w-3.5 text-amber" /> Pressure
                </span>
                <div className="mt-1 font-mono text-2xl font-bold text-foreground">
                  {available.has("pressure") ? `${data.pressure.toFixed(1)} hPa` : NO_DATA}
                </div>
                <div className="text-2xs font-mono text-muted-foreground mt-1">
                  Updated {getAge("pressure")}
                </div>
              </div>

              <div className="rounded-md border border-border bg-surface-1 p-3">
                <span className="eyebrow text-2xs flex items-center gap-1.5 text-muted-foreground">
                  <Mountain className="h-3.5 w-3.5 text-cyan" /> Calculated Altitude
                </span>
                <div className="mt-1 font-mono text-2xl font-bold text-foreground">
                  {available.has("altitude") ? `${data.altitude.toFixed(1)} m` : NO_DATA}
                </div>
                <div className="text-2xs font-mono text-muted-foreground mt-1">
                  Hypsometric formula
                </div>
              </div>
            </div>

            <dl className="space-y-1.5 text-xs font-mono border-t border-border/60 pt-3">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Interface Bus:</dt>
                <dd className="text-foreground">I2C Standard-Mode (0x76 address)</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Sea-Level Baseline (QNH):</dt>
                <dd className="text-foreground">1013.25 hPa (ISA Standard)</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Diagnostics:</dt>
                <dd className="text-success">
                  {bmp280State?.errors.length
                    ? bmp280State.errors.join(", ")
                    : "Calibrated & Stable"}
                </dd>
              </div>
            </dl>
          </div>
        </Widget>

        {/* MPU6050 6-DOF IMU Sensor */}
        <Widget
          title="MPU6050 · 6-DOF Inertial Measurement Unit"
          icon={<Activity className="h-4 w-4" />}
          span="twoThirds"
          status={
            <StatusBadge tone={mpu6050State?.health === "ok" ? "ok" : "warn"}>
              {mpu6050State?.health.toUpperCase() ?? "AWAITING"}
            </StatusBadge>
          }
        >
          <div className="space-y-4">
            {/* Tri-axis Acceleration */}
            <div>
              <span className="eyebrow text-2xs block mb-2">
                Linear Acceleration ({ACCEL.label})
              </span>
              <div className="grid grid-cols-3 gap-3 font-mono">
                <div className="rounded border border-border bg-surface-1 p-2.5">
                  <span className="text-amber text-xs font-semibold">ACCEL X</span>
                  <div className="text-xl font-bold text-foreground mt-1">
                    {available.has("accelerationX")
                      ? data.accelerationX.toFixed(ACCEL.digits)
                      : NO_DATA}
                  </div>
                </div>
                <div className="rounded border border-border bg-surface-1 p-2.5">
                  <span className="text-cyan text-xs font-semibold">ACCEL Y</span>
                  <div className="text-xl font-bold text-foreground mt-1">
                    {available.has("accelerationY")
                      ? data.accelerationY.toFixed(ACCEL.digits)
                      : NO_DATA}
                  </div>
                </div>
                <div className="rounded border border-border bg-surface-1 p-2.5">
                  <span className="text-purple text-xs font-semibold">ACCEL Z</span>
                  <div className="text-xl font-bold text-foreground mt-1">
                    {available.has("accelerationZ")
                      ? data.accelerationZ.toFixed(ACCEL.digits)
                      : NO_DATA}
                  </div>
                </div>
              </div>
            </div>

            {/* Tri-axis Gyroscope */}
            <div>
              <span className="eyebrow text-2xs block mb-2">Angular Velocity (°/s)</span>
              <div className="grid grid-cols-3 gap-3 font-mono">
                <div className="rounded border border-border bg-surface-1 p-2.5">
                  <span className="text-amber text-xs font-semibold">GYRO X</span>
                  <div className="text-xl font-bold text-foreground mt-1">
                    {available.has("gyroX") ? data.gyroX.toFixed(2) : NO_DATA}
                  </div>
                </div>
                <div className="rounded border border-border bg-surface-1 p-2.5">
                  <span className="text-cyan text-xs font-semibold">GYRO Y</span>
                  <div className="text-xl font-bold text-foreground mt-1">
                    {available.has("gyroY") ? data.gyroY.toFixed(2) : NO_DATA}
                  </div>
                </div>
                <div className="rounded border border-border bg-surface-1 p-2.5">
                  <span className="text-purple text-xs font-semibold">GYRO Z</span>
                  <div className="text-xl font-bold text-foreground mt-1">
                    {available.has("gyroZ") ? data.gyroZ.toFixed(2) : NO_DATA}
                  </div>
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono border-t border-border/60 pt-3">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Attitude (Roll / Pitch):</dt>
                <dd className="text-foreground">
                  {available.has("roll")
                    ? `${data.roll.toFixed(1)}° / ${data.pitch.toFixed(1)}°`
                    : NO_DATA}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Digital Low Pass Filter:</dt>
                <dd className="text-foreground">DLPF 42 Hz (DMP Enabled)</dd>
              </div>
            </dl>
          </div>
        </Widget>

        {/* GPS Receiver */}
        <Widget
          title="GPS NEO-6M · Satellite Positioning"
          icon={<Globe className="h-4 w-4" />}
          span="third"
          status={
            <StatusBadge tone={data.gpsFix ? "ok" : "warn"}>
              {data.gpsFix ? "3D FIX ACQUIRED" : "SEARCHING SATS"}
            </StatusBadge>
          }
        >
          <div className="space-y-4 font-mono">
            <div className="rounded-md border border-border bg-surface-1 p-3">
              <span className="eyebrow text-2xs block">Geodetic Coordinates</span>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">LATITUDE:</span>
                  <span className="font-bold text-foreground">
                    {available.has("latitude") ? `${data.latitude.toFixed(5)}° N` : NO_DATA}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">LONGITUDE:</span>
                  <span className="font-bold text-foreground">
                    {available.has("longitude") ? `${data.longitude.toFixed(5)}° E` : NO_DATA}
                  </span>
                </div>
              </div>
            </div>

            <dl className="space-y-2 text-xs pt-1">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Constellation Tracked:</dt>
                <dd className="text-foreground">
                  {data.gpsFix ? "9 Satellites (GPS/GLONASS)" : "Awaiting almanac"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Baud / UART:</dt>
                <dd className="text-foreground">9600 bps / NMEA 0183</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Fix Quality:</dt>
                <dd
                  className={
                    data.gpsFix ? "text-success font-semibold" : "text-amber font-semibold"
                  }
                >
                  {data.gpsFix ? "Autonomous 3D Fix" : "Searching (No Fix)"}
                </dd>
              </div>
            </dl>
          </div>
        </Widget>
      </WidgetGrid>
    </div>
  );
}
