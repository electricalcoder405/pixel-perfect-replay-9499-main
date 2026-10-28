import { useState } from "react";
import {
  Activity,
  Compass,
  Cpu,
  Droplets,
  Gauge,
  Globe,
  HardDrive,
  Hash,
  Mountain,
  Navigation,
  Radio,
  RotateCw,
  Search,
  Signal,
  Thermometer,
  Timer,
  Zap,
} from "lucide-react";
import {
  ConnectionIndicator,
  MetricValue,
  PageHeader,
  StatusBadge,
  WaitingForGroundBanner,
  Widget,
  WidgetGrid,
} from "@/components/ds";
import { Input } from "@/components/ui/input";
import { formatValue, fmtTime, NO_DATA } from "@/telemetry/format";
import { useTelemetrySnapshot } from "@/telemetry/hooks";
import { ACCEL } from "@/telemetry/units";
import type { TelemetryField } from "@/telemetry/model";
import { useNow } from "@/hooks/use-now";

interface ChannelDefinition {
  field: TelemetryField;
  label: string;
  category: "atmospheric" | "inertial" | "navigation" | "system";
  sensor: string;
  unit: string;
  icon: React.ReactNode;
  format?: (v: number) => string;
}

const CHANNELS: readonly ChannelDefinition[] = [
  // Atmospheric (DHT11 + BMP280)
  {
    field: "temperature",
    label: "Temperature (DHT11/BMP280)",
    category: "atmospheric",
    sensor: "DHT11 / BMP280",
    unit: "°C",
    icon: <Thermometer className="h-4 w-4" />,
  },
  {
    field: "humidity",
    label: "Relative Humidity",
    category: "atmospheric",
    sensor: "DHT11",
    unit: "%",
    icon: <Droplets className="h-4 w-4" />,
  },
  {
    field: "pressure",
    label: "Barometric Pressure",
    category: "atmospheric",
    sensor: "BMP280",
    unit: "hPa",
    icon: <Gauge className="h-4 w-4" />,
  },
  {
    field: "altitude",
    label: "Estimated Altitude",
    category: "atmospheric",
    sensor: "BMP280 / GPS",
    unit: "m",
    icon: <Mountain className="h-4 w-4" />,
  },

  // Inertial & Attitude (MPU6050)
  {
    field: "accelerationX",
    label: "Acceleration X",
    category: "inertial",
    sensor: "MPU6050",
    unit: ACCEL.label,
    icon: <Activity className="h-4 w-4" />,
    format: (v) => v.toFixed(ACCEL.digits),
  },
  {
    field: "accelerationY",
    label: "Acceleration Y",
    category: "inertial",
    sensor: "MPU6050",
    unit: ACCEL.label,
    icon: <Activity className="h-4 w-4" />,
    format: (v) => v.toFixed(ACCEL.digits),
  },
  {
    field: "accelerationZ",
    label: "Acceleration Z",
    category: "inertial",
    sensor: "MPU6050",
    unit: ACCEL.label,
    icon: <Activity className="h-4 w-4" />,
    format: (v) => v.toFixed(ACCEL.digits),
  },
  {
    field: "gyroX",
    label: "Angular Velocity X",
    category: "inertial",
    sensor: "MPU6050",
    unit: "°/s",
    icon: <RotateCw className="h-4 w-4" />,
    format: (v) => v.toFixed(2),
  },
  {
    field: "gyroY",
    label: "Angular Velocity Y",
    category: "inertial",
    sensor: "MPU6050",
    unit: "°/s",
    icon: <RotateCw className="h-4 w-4" />,
    format: (v) => v.toFixed(2),
  },
  {
    field: "gyroZ",
    label: "Angular Velocity Z",
    category: "inertial",
    sensor: "MPU6050",
    unit: "°/s",
    icon: <RotateCw className="h-4 w-4" />,
    format: (v) => v.toFixed(2),
  },
  {
    field: "roll",
    label: "Roll Attitude",
    category: "inertial",
    sensor: "MPU6050",
    unit: "°",
    icon: <Compass className="h-4 w-4" />,
    format: (v) => v.toFixed(1),
  },
  {
    field: "pitch",
    label: "Pitch Attitude",
    category: "inertial",
    sensor: "MPU6050",
    unit: "°",
    icon: <Compass className="h-4 w-4" />,
    format: (v) => v.toFixed(1),
  },
  {
    field: "yaw",
    label: "Yaw / Heading",
    category: "inertial",
    sensor: "MPU6050",
    unit: "°",
    icon: <Compass className="h-4 w-4" />,
    format: (v) => v.toFixed(1),
  },

  // Navigation (GPS)
  {
    field: "latitude",
    label: "Latitude",
    category: "navigation",
    sensor: "GPS NEO-6M",
    unit: "°N",
    icon: <Navigation className="h-4 w-4" />,
    format: (v) => v.toFixed(5),
  },
  {
    field: "longitude",
    label: "Longitude",
    category: "navigation",
    sensor: "GPS NEO-6M",
    unit: "°E",
    icon: <Globe className="h-4 w-4" />,
    format: (v) => v.toFixed(5),
  },

  // System & Link
  {
    field: "packetCount",
    label: "Packet Sequence",
    category: "system",
    sensor: "Receiver",
    unit: "seq",
    icon: <Hash className="h-4 w-4" />,
    format: (v) => String(Math.round(v)),
  },
  {
    field: "signalStrength",
    label: "Signal Strength (RSSI)",
    category: "system",
    sensor: "ESP-NOW / ESP8266",
    unit: "dBm",
    icon: <Signal className="h-4 w-4" />,
    format: (v) => String(Math.round(v)),
  },
  {
    field: "battery",
    label: "Battery Level",
    category: "system",
    sensor: "Power Management",
    unit: "%",
    icon: <Zap className="h-4 w-4" />,
    format: (v) => v.toFixed(1),
  },
  {
    field: "missionTime",
    label: "Spacecraft Uptime",
    category: "system",
    sensor: "ESP32 Core",
    unit: "",
    icon: <Timer className="h-4 w-4" />,
    format: (v) => fmtTime(Math.round(v)),
  },
];

export function TelemetryChannelPage() {
  const snapshot = useTelemetrySnapshot();
  const now = useNow(1000);
  const [filter, setFilter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data, available, updatedAt, source } = snapshot;

  const filteredChannels = CHANNELS.filter((ch) => {
    const matchesCategory = selectedCategory === "all" || ch.category === selectedCategory;
    const matchesSearch =
      ch.label.toLowerCase().includes(filter.toLowerCase()) ||
      ch.sensor.toLowerCase().includes(filter.toLowerCase()) ||
      ch.field.toLowerCase().includes(filter.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Telemetry Matrix"
        title="Telemetry Channels"
        description="Comprehensive live data bus monitoring across all spacecraft sensors and subsystems."
        actions={<ConnectionIndicator />}
      />

      <WaitingForGroundBanner />

      {/* Filter and Category Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {["all", "atmospheric", "inertial", "navigation", "system"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-md px-3 py-1 font-mono text-xs uppercase tracking-wider transition-colors ${
                selectedCategory === cat
                  ? "bg-amber text-black font-semibold shadow-sm"
                  : "bg-surface-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground border border-border"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search channels..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-8 pl-8 font-mono text-xs"
          />
        </div>
      </div>

      {/* Telemetry Channel Grid */}
      <WidgetGrid>
        {filteredChannels.map((ch) => {
          const isAvail = available.has(ch.field);
          const rawVal = data[ch.field];
          const displayVal =
            isAvail && typeof rawVal === "number"
              ? ch.format
                ? ch.format(rawVal)
                : formatValue(rawVal)
              : NO_DATA;

          const lastUpdateMs = updatedAt[ch.field];
          const ageS = lastUpdateMs
            ? Math.max(0, Math.round((now.getTime() - lastUpdateMs) / 1000))
            : null;

          return (
            <Widget
              key={ch.field}
              span="third"
              title={ch.label}
              icon={ch.icon}
              status={
                <StatusBadge tone={isAvail ? "ok" : "neutral"}>
                  {isAvail ? (ageS !== null && ageS > 10 ? "STALE" : "ONLINE") : "NO DATA"}
                </StatusBadge>
              }
            >
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <div className="font-mono text-2xl font-bold tracking-tight text-foreground">
                    {displayVal}
                    {isAvail && ch.unit && (
                      <span className="ml-1 text-sm font-normal text-muted-foreground">
                        {ch.unit}
                      </span>
                    )}
                  </div>
                  <span className="eyebrow text-2xs">{ch.sensor}</span>
                </div>

                <div className="flex items-center justify-between border-t border-border/60 pt-2 text-2xs font-mono text-muted-foreground">
                  <span>Source: {source.kind === "websocket" ? "ESP-NOW Link" : source.label}</span>
                  <span>{ageS !== null ? `${ageS}s ago` : "Awaiting packet"}</span>
                </div>
              </div>
            </Widget>
          );
        })}
      </WidgetGrid>
    </div>
  );
}
