import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";
import type { HistoryPoint } from "@/telemetry/model";
import { OldMonkChartMarker } from "@/components/ds/OldMonkBottleMarker";
import { Button } from "@/components/ui/button";

export interface InteractiveChartChannel {
  key: keyof HistoryPoint;
  label: string;
  color: string;
  unit: string;
}

interface InteractiveTelemetryChartProps {
  data: readonly HistoryPoint[];
  channels: readonly InteractiveChartChannel[];
  title?: string;
  height?: number;
  showBottleMarker?: boolean;
  defaultTimeRange?: "30s" | "1m" | "5m" | "all";
  allowAreaToggle?: boolean;
}

export function InteractiveTelemetryChart({
  data,
  channels,
  title,
  height = 240,
  showBottleMarker = true,
  defaultTimeRange = "1m",
  allowAreaToggle = true,
}: InteractiveTelemetryChartProps) {
  const [range, setRange] = useState<"30s" | "1m" | "5m" | "all">(defaultTimeRange);
  const [isArea, setIsArea] = useState(false);

  // Filter or slice data based on selected time window
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (range === "all") return data;

    const count = range === "30s" ? 30 : range === "1m" ? 60 : 300;
    return data.slice(-count);
  }, [data, range]);

  const latestPoint = filteredData[filteredData.length - 1];

  return (
    <div className="flex flex-col space-y-2">
      {/* Chart toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {title && <span className="eyebrow text-foreground">{title}</span>}
        <div className="ml-auto flex items-center gap-1">
          <div className="flex items-center rounded-md border border-border bg-surface-1 p-0.5">
            {(["30s", "1m", "5m", "all"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded px-2 py-0.5 font-mono text-2xs transition-colors ${
                  range === r
                    ? "bg-amber text-black font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          {allowAreaToggle && (
            <Button
              variant="quiet"
              size="sm"
              onClick={() => setIsArea(!isArea)}
              className="h-6 px-2 text-2xs"
            >
              {isArea ? "Line" : "Area"}
            </Button>
          )}
        </div>
      </div>

      {/* Chart Canvas */}
      <div style={{ height }} className="relative w-full">
        {filteredData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Awaiting telemetry data...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {isArea && channels.length === 1 ? (
              <AreaChart
                data={[...filteredData]}
                margin={{ top: 12, right: 12, left: -20, bottom: 4 }}
              >
                <defs>
                  <linearGradient
                    id={`grad-${String(channels[0]?.key)}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={channels[0]?.color ?? "var(--amber)"}
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor={channels[0]?.color ?? "var(--amber)"}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  opacity={0.4}
                  vertical={false}
                />
                <XAxis
                  dataKey="t"
                  tickLine={false}
                  stroke="var(--muted-foreground)"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v) => `${v}s`}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tickLine={false}
                  stroke="var(--muted-foreground)"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="glass rounded-md border border-border p-2 font-mono text-xs shadow-lg">
                        <div className="mb-1 text-2xs text-muted-foreground">T + {label}s</div>
                        {payload.map((p, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ background: p.color }}
                            />
                            <span className="text-muted-foreground">{p.name}:</span>
                            <span className="font-semibold text-foreground">
                              {typeof p.value === "number" ? p.value.toFixed(2) : p.value}{" "}
                              {channels[idx]?.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={channels[0]?.key as string}
                  name={channels[0]?.label ?? ""}
                  stroke={channels[0]?.color ?? "var(--amber)"}
                  strokeWidth={2}
                  fill={`url(#grad-${String(channels[0]?.key)})`}
                  isAnimationActive={false}
                  dot={
                    showBottleMarker
                      ? (dotProps: Record<string, unknown>) => (
                          <OldMonkChartMarker
                            {...dotProps}
                            dataLength={filteredData.length}
                            stroke={channels[0]?.color}
                          />
                        )
                      : false
                  }
                />
              </AreaChart>
            ) : (
              <LineChart
                data={[...filteredData]}
                margin={{ top: 12, right: 12, left: -20, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  opacity={0.4}
                  vertical={false}
                />
                <XAxis
                  dataKey="t"
                  tickLine={false}
                  stroke="var(--muted-foreground)"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v) => `${v}s`}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tickLine={false}
                  stroke="var(--muted-foreground)"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="glass rounded-md border border-border p-2 font-mono text-xs shadow-lg">
                        <div className="mb-1 text-2xs text-muted-foreground">T + {label}s</div>
                        {payload.map((p, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ background: p.color }}
                            />
                            <span className="text-muted-foreground">{p.name}:</span>
                            <span className="font-semibold text-foreground">
                              {typeof p.value === "number" ? p.value.toFixed(2) : p.value}{" "}
                              {channels[idx]?.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                {channels.map((ch, idx) => (
                  <Line
                    key={String(ch.key)}
                    type="monotone"
                    dataKey={ch.key as string}
                    name={ch.label ?? ""}
                    stroke={ch.color}
                    strokeWidth={2}
                    dot={
                      showBottleMarker && idx === 0
                        ? (dotProps: Record<string, unknown>) => (
                            <OldMonkChartMarker
                              {...dotProps}
                              dataLength={filteredData.length}
                              stroke={ch.color}
                            />
                          )
                        : false
                    }
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
