import { useMemo } from "react";
import {
  Activity,
  BarChart2,
  Compass,
  Cpu,
  Droplets,
  Gauge,
  LineChart as LineChartIcon,
  Radio,
  Signal,
  Thermometer,
  Timer,
  Zap,
} from "lucide-react";
import {
  ConnectionIndicator,
  PageHeader,
  StatusBadge,
  WaitingForGroundBanner,
  Widget,
  WidgetGrid,
} from "@/components/ds";
import { InteractiveTelemetryChart } from "@/components/charts/InteractiveTelemetryChart";
import { formatValue, fmtTime, NO_DATA } from "@/telemetry/format";
import { useTelemetrySnapshot } from "@/telemetry/hooks";

export function AnalyticsPage() {
  const snapshot = useTelemetrySnapshot();
  const { history, diagnostics, mission, available, data } = snapshot;

  // Compute statistical aggregates (min, max, avg) from recorded history
  const stats = useMemo(() => {
    if (!history || history.length === 0) return null;

    const compute = (key: "temperature" | "pressure" | "humidity") => {
      const values = history.map((p) => p[key]).filter((v) => typeof v === "number" && !isNaN(v));
      if (values.length === 0) return { min: null, max: null, avg: null };
      const min = Math.min(...values);
      const max = Math.max(...values);
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      return { min, max, avg };
    };

    return {
      temp: compute("temperature"),
      press: compute("pressure"),
      hum: compute("humidity"),
    };
  }, [history]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Data Analysis"
        title="Mission Analytics & Trend Analysis"
        description="High-frequency telemetry trends, statistical sensor variance, packet loss analysis, and real-time mission metrics."
        actions={<ConnectionIndicator />}
      />

      <WaitingForGroundBanner />

      {/* Mission Key Statistics Row */}
      <WidgetGrid>
        <Widget title="Total Duration" icon={<Timer className="h-4 w-4" />} span="quarter">
          <div className="font-mono text-2xl font-bold text-amber">{fmtTime(data.missionTime)}</div>
          <div className="text-2xs font-mono text-muted-foreground mt-1">Elapsed Mission Time</div>
        </Widget>

        <Widget title="Telemetry Packets" icon={<Activity className="h-4 w-4" />} span="quarter">
          <div className="font-mono text-2xl font-bold text-foreground">{diagnostics.received}</div>
          <div className="text-2xs font-mono text-muted-foreground mt-1">Valid frames decoded</div>
        </Widget>

        <Widget title="Throughput Rate" icon={<Signal className="h-4 w-4" />} span="quarter">
          <div className="font-mono text-2xl font-bold text-cyan">
            {diagnostics.packetsPerSecond.toFixed(1)}{" "}
            <span className="text-sm font-normal text-muted-foreground">pkt/s</span>
          </div>
          <div className="text-2xs font-mono text-muted-foreground mt-1">
            Real-time update frequency
          </div>
        </Widget>

        <Widget title="Packet Loss Ratio" icon={<Radio className="h-4 w-4" />} span="quarter">
          <div className="font-mono text-2xl font-bold text-amber">
            {diagnostics.lossPercent.toFixed(1)} %
          </div>
          <div className="text-2xs font-mono text-muted-foreground mt-1">
            {diagnostics.missed} missing sequence IDs
          </div>
        </Widget>
      </WidgetGrid>

      {/* Atmospheric Realtime Interactive Chart */}
      <WidgetGrid>
        <Widget
          title="Atmospheric Dynamics (Temperature & Humidity)"
          icon={<Thermometer className="h-4 w-4" />}
          span="half"
        >
          <InteractiveTelemetryChart
            data={history}
            channels={[
              { key: "temperature", label: "Temperature", color: "var(--amber)", unit: "°C" },
              { key: "humidity", label: "Humidity", color: "var(--cyan)", unit: "%" },
            ]}
            height={260}
          />
        </Widget>

        {/* Barometric Pressure Interactive Chart */}
        <Widget
          title="Barometric Pressure Trend (BMP280)"
          icon={<Gauge className="h-4 w-4" />}
          span="half"
        >
          <InteractiveTelemetryChart
            data={history}
            channels={[
              { key: "pressure", label: "Barometric Pressure", color: "var(--cyan)", unit: "hPa" },
            ]}
            height={260}
          />
        </Widget>

        {/* 3-Axis Acceleration Dynamics Chart */}
        <Widget
          title="Tri-Axis Acceleration Dynamics (MPU6050)"
          icon={<Activity className="h-4 w-4" />}
          span="half"
        >
          <InteractiveTelemetryChart
            data={history}
            channels={[
              { key: "ax", label: "Accel X", color: "var(--amber)", unit: "g" },
              { key: "ay", label: "Accel Y", color: "var(--cyan)", unit: "g" },
              { key: "az", label: "Accel Z", color: "var(--purple)", unit: "g" },
            ]}
            height={260}
          />
        </Widget>

        {/* 3-Axis Angular Velocity Chart */}
        <Widget
          title="Angular Rate & Attitude Gyro Dynamics"
          icon={<Compass className="h-4 w-4" />}
          span="half"
        >
          <InteractiveTelemetryChart
            data={history}
            channels={[
              { key: "gx", label: "Gyro X", color: "var(--amber)", unit: "°/s" },
              { key: "gy", label: "Gyro Y", color: "var(--cyan)", unit: "°/s" },
              { key: "gz", label: "Gyro Z", color: "var(--cyan)", unit: "°/s" },
            ]}
            height={260}
          />
        </Widget>

        {/* Statistical Variance Table */}
        <Widget
          title="Statistical Channel Metrics (Min / Max / Mean)"
          icon={<BarChart2 className="h-4 w-4" />}
          span="full"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-border text-2xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2">Channel Name</th>
                  <th className="pb-2">Sensor</th>
                  <th className="pb-2">Current</th>
                  <th className="pb-2">Minimum</th>
                  <th className="pb-2">Maximum</th>
                  <th className="pb-2">Mean / Average</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                <tr>
                  <td className="py-2.5 font-semibold text-foreground">Temperature</td>
                  <td className="py-2.5 text-muted-foreground">DHT11 / BMP280</td>
                  <td className="py-2.5 text-amber">
                    {available.has("temperature") ? `${data.temperature.toFixed(1)} °C` : NO_DATA}
                  </td>
                  <td className="py-2.5">
                    {stats?.temp.min !== null ? `${stats?.temp.min?.toFixed(1)} °C` : NO_DATA}
                  </td>
                  <td className="py-2.5">
                    {stats?.temp.max !== null ? `${stats?.temp.max?.toFixed(1)} °C` : NO_DATA}
                  </td>
                  <td className="py-2.5 text-cyan">
                    {stats?.temp.avg !== null ? `${stats?.temp.avg?.toFixed(1)} °C` : NO_DATA}
                  </td>
                  <td className="py-2.5">
                    <StatusBadge tone="ok">NOMINAL</StatusBadge>
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 font-semibold text-foreground">Relative Humidity</td>
                  <td className="py-2.5 text-muted-foreground">DHT11</td>
                  <td className="py-2.5 text-amber">
                    {available.has("humidity") ? `${data.humidity.toFixed(1)} %` : NO_DATA}
                  </td>
                  <td className="py-2.5">
                    {stats?.hum.min !== null ? `${stats?.hum.min?.toFixed(1)} %` : NO_DATA}
                  </td>
                  <td className="py-2.5">
                    {stats?.hum.max !== null ? `${stats?.hum.max?.toFixed(1)} %` : NO_DATA}
                  </td>
                  <td className="py-2.5 text-cyan">
                    {stats?.hum.avg !== null ? `${stats?.hum.avg?.toFixed(1)} %` : NO_DATA}
                  </td>
                  <td className="py-2.5">
                    <StatusBadge tone="ok">NOMINAL</StatusBadge>
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 font-semibold text-foreground">Barometric Pressure</td>
                  <td className="py-2.5 text-muted-foreground">BMP280</td>
                  <td className="py-2.5 text-amber">
                    {available.has("pressure") ? `${data.pressure.toFixed(1)} hPa` : NO_DATA}
                  </td>
                  <td className="py-2.5">
                    {stats?.press.min !== null ? `${stats?.press.min?.toFixed(1)} hPa` : NO_DATA}
                  </td>
                  <td className="py-2.5">
                    {stats?.press.max !== null ? `${stats?.press.max?.toFixed(1)} hPa` : NO_DATA}
                  </td>
                  <td className="py-2.5 text-cyan">
                    {stats?.press.avg !== null ? `${stats?.press.avg?.toFixed(1)} hPa` : NO_DATA}
                  </td>
                  <td className="py-2.5">
                    <StatusBadge tone="ok">NOMINAL</StatusBadge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Widget>
      </WidgetGrid>
    </div>
  );
}
