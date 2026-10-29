import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Filter,
  Info,
  Pause,
  Play,
  Radio,
  RefreshCw,
  ScrollText,
  Search,
  ShieldAlert,
  Terminal,
  Trash2,
  Zap,
} from "lucide-react";
import {
  ConnectionIndicator,
  MetricValue,
  PageHeader,
  StatusBadge,
  Widget,
  WidgetGrid,
} from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNow } from "@/hooks/use-now";
import { useTelemetrySnapshot } from "@/telemetry/hooks";

export type LogLevel = "all" | "packet" | "info" | "warn" | "crit" | "link";
export type LogSubsystem = "all" | "telemetry" | "gps" | "sensors" | "radio" | "system";

export interface LogEntry {
  id: string;
  timestamp: number;
  timeString: string;
  level: "packet" | "info" | "warn" | "crit" | "link";
  subsystem: "telemetry" | "gps" | "sensors" | "radio" | "system";
  sourceTag: string;
  message: string;
  packetNo?: number;
  details?: Record<string, unknown> | string;
}

const LEVEL_COLORS: Record<LogEntry["level"], { text: string; badge: string; bg: string }> = {
  packet: { text: "text-cyan", badge: "border-cyan/40 bg-cyan/10 text-cyan", bg: "hover:bg-cyan/5" },
  info: { text: "text-foreground", badge: "border-border bg-muted/60 text-muted-foreground", bg: "hover:bg-muted/10" },
  warn: { text: "text-amber", badge: "border-amber/40 bg-amber/10 text-amber", bg: "hover:bg-amber/5" },
  crit: { text: "text-critical", badge: "border-critical/40 bg-critical/10 text-critical", bg: "hover:bg-critical/5" },
  link: { text: "text-success", badge: "border-success/40 bg-success/10 text-success", bg: "hover:bg-success/5" },
};

export function LogsPage() {
  const snapshot = useTelemetrySnapshot();
  const now = useNow(1000);
  const { data, diagnostics, alerts, connection } = snapshot;

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<LogLevel>("all");
  const [selectedSubsystem, setSelectedSubsystem] = useState<LogSubsystem>("all");
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);
  const [copied, setCopied] = useState(false);

  const terminalRef = useRef<HTMLDivElement>(null);
  const lastPacketRef = useRef<number>(-1);
  const seenEventsRef = useRef<Set<string>>(new Set());
  const seenAlertsRef = useRef<Set<string>>(new Set());

  const formatTimestamp = useCallback((ts: number) => {
    const d = new Date(ts);
    const timeStr = d.toLocaleTimeString("en-GB", { hour12: false });
    const ms = String(ts % 1000).padStart(3, "0");
    return `${timeStr}.${ms}`;
  }, []);

  // Initial seed logs
  useEffect(() => {
    const baseTime = Date.now() - 45000;
    const initialSeed: LogEntry[] = [
      {
        id: "boot-1",
        timestamp: baseTime,
        timeString: formatTimestamp(baseTime),
        level: "info",
        subsystem: "system",
        sourceTag: "SYSTEM",
        message: "ORBITRA-26 mission flight computer core initialized (ARM Cortex-M4)",
        details: { subsystem: "Core", rev: "2.1", firmware: "v1.4.0", state: "NOMINAL" },
      },
      {
        id: "boot-2",
        timestamp: baseTime + 1200,
        timeString: formatTimestamp(baseTime + 1200),
        level: "link",
        subsystem: "radio",
        sourceTag: "RF-LINK",
        message: "Ground radio bridge connected on COM3 @ 115200 baud · ESP-NOW protocol ready",
        details: { port: "COM3", baudRate: 115200, protocol: "ESP-NOW 2.4GHz", channel: 1 },
      },
      {
        id: "boot-3",
        timestamp: baseTime + 2800,
        timeString: formatTimestamp(baseTime + 2800),
        level: "info",
        subsystem: "sensors",
        sourceTag: "SENSORS",
        message: "DHT11 (Temp/Humidity) and BMP280 (Barometer) self-test OK · Reference baseline 1013.25 hPa",
        details: { dht11: "OK", bmp280: "OK", baseline: "1013.25 hPa" },
      },
      {
        id: "boot-4",
        timestamp: baseTime + 4100,
        timeString: formatTimestamp(baseTime + 4100),
        level: "info",
        subsystem: "sensors",
        sourceTag: "MPU6050",
        message: "MPU-6050 6-DoF inertial measurement unit calibrated · Accelerometer and Gyro nominal",
        details: { accelRange: "±8g", gyroRange: "±500deg/s", calibrationOffset: "Applied" },
      },
      {
        id: "boot-5",
        timestamp: baseTime + 6500,
        timeString: formatTimestamp(baseTime + 6500),
        level: "info",
        subsystem: "gps",
        sourceTag: "GPS-NAV",
        message: "NEO-6M GNSS module active · Ephemeris almanac loaded · 3D satellite lock acquired",
        details: { fixType: "3D Fix", satellitesVisible: 9, hdop: 1.1 },
      },
    ];

    setLogs(initialSeed);
  }, [formatTimestamp]);

  // Sync diagnostic events
  useEffect(() => {
    if (!diagnostics.events || diagnostics.events.length === 0) return;

    diagnostics.events.forEach((evt) => {
      const key = `${evt.at}-${evt.type}-${evt.detail}`;
      if (seenEventsRef.current.has(key)) return;
      seenEventsRef.current.add(key);

      const level: LogEntry["level"] =
        evt.type === "error"
          ? "crit"
          : evt.type === "packet-gap" || evt.type === "stale"
            ? "warn"
            : evt.type === "connected"
              ? "link"
              : "info";

      const newEntry: LogEntry = {
        id: `evt-${evt.at}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: evt.at,
        timeString: formatTimestamp(evt.at),
        level,
        subsystem: evt.type.includes("link") || evt.type.includes("connect") ? "radio" : "telemetry",
        sourceTag: evt.type.toUpperCase(),
        message: evt.detail,
        details: { rawType: evt.type, timestamp: evt.at },
      };

      setLogs((prev) => [...prev.slice(-499), newEntry]);
    });
  }, [diagnostics.events, formatTimestamp]);

  // Sync alerts
  useEffect(() => {
    if (!alerts || alerts.length === 0) return;

    alerts.forEach((alert) => {
      const key = `${alert.id}-${alert.timestamp}-${alert.resolved}`;
      if (seenAlertsRef.current.has(key)) return;
      seenAlertsRef.current.add(key);

      const level: LogEntry["level"] = alert.level === "critical" ? "crit" : "warn";
      const newEntry: LogEntry = {
        id: `alt-${alert.id}-${Date.now()}`,
        timestamp: alert.timestamp,
        timeString: formatTimestamp(alert.timestamp),
        level,
        subsystem: "system",
        sourceTag: "ALERT",
        message: `${alert.resolved ? "[RESOLVED] " : ""}${alert.message}`,
        details: {
          ruleId: alert.ruleId,
          level: alert.level,
          field: alert.field,
          value: alert.value,
          threshold: alert.threshold,
          resolved: alert.resolved,
        },
      };

      setLogs((prev) => [...prev.slice(-499), newEntry]);
    });
  }, [alerts, formatTimestamp]);

  // Incoming packet ingestion
  useEffect(() => {
    if (isPaused) return;
    if (data.packetCount === undefined || data.packetCount <= 0) return;
    if (data.packetCount === lastPacketRef.current) return;

    lastPacketRef.current = data.packetCount;
    const nowTs = Date.now();
    const timeStr = formatTimestamp(nowTs);

    const pktEntry: LogEntry = {
      id: `pkt-${data.packetCount}-${nowTs}`,
      timestamp: nowTs,
      timeString: timeStr,
      level: "packet",
      subsystem: "telemetry",
      sourceTag: "OLDMONK",
      message: `Frame #${String(data.packetCount).padStart(5, "0")} · RSSI: ${data.signalStrength ?? -65} dBm · Batt: ${data.battery?.toFixed(0) ?? 85}% · Alt: ${data.altitude?.toFixed(1) ?? 41}m · Temp: ${data.temperature?.toFixed(1) ?? 24}°C`,
      packetNo: data.packetCount,
      details: {
        packetNumber: data.packetCount,
        signalStrength: `${data.signalStrength} dBm`,
        batteryPercent: `${data.battery}%`,
        charging: data.charging ? "Solar Array Active" : "Battery Discharging",
        altitude: `${data.altitude} m`,
        pressure: `${data.pressure} hPa`,
        temperature: `${data.temperature} °C`,
        humidity: `${data.humidity} %`,
        gpsCoordinates: `${data.latitude?.toFixed(5)}°N, ${data.longitude?.toFixed(5)}°E`,
        gpsLock: data.gpsFix ? "3D Carrier Lock" : "Acquiring Fix",
        attitude: `Roll: ${data.roll?.toFixed(1)}°, Pitch: ${data.pitch?.toFixed(1)}°, Yaw: ${data.yaw?.toFixed(1)}°`,
        missionTimeSeconds: data.missionTime,
      },
    };

    setLogs((prev) => [...prev.slice(-499), pktEntry]);
  }, [data.packetCount, data, isPaused, formatTimestamp]);

  // Auto-scroll handler
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (selectedLevel !== "all" && l.level !== selectedLevel) return false;
      if (selectedSubsystem !== "all" && l.subsystem !== selectedSubsystem) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesMsg = l.message.toLowerCase().includes(query);
        const matchesTag = l.sourceTag.toLowerCase().includes(query);
        const matchesPkt = l.packetNo !== undefined && String(l.packetNo).includes(query);
        if (!matchesMsg && !matchesTag && !matchesPkt) return false;
      }
      return true;
    });
  }, [logs, selectedLevel, selectedSubsystem, searchQuery]);

  // Counts for metric badges
  const totalPackets = useMemo(() => logs.filter((l) => l.level === "packet").length, [logs]);
  const totalWarnings = useMemo(
    () => logs.filter((l) => l.level === "warn" || l.level === "crit").length,
    [logs],
  );

  // Clear logs handler
  const handleClear = () => {
    setLogs([]);
    setSelectedEntry(null);
  };

  // Copy logs to clipboard
  const handleCopyLogs = () => {
    const text = filteredLogs
      .map((l) => `[${l.timeString}] [${l.level.toUpperCase()}] [${l.sourceTag}] ${l.message}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export logs as text file
  const handleExportText = () => {
    const text = filteredLogs
      .map(
        (l) =>
          `[${l.timeString}] [${l.level.toUpperCase()}] [${l.sourceTag}] ${l.message}${
            l.details ? `\n  PAYLOAD: ${JSON.stringify(l.details)}` : ""
          }`,
      )
      .join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mission-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Mission Data"
        title="Mission Logs & Flight Event Stream"
        description="High-frequency telemetry stream, serial packet receipts, subsystem state notices, and diagnostics bus log."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={isPaused ? "brand" : "quiet"}
              onClick={() => setIsPaused(!isPaused)}
              title={isPaused ? "Resume real-time logging" : "Pause incoming log stream"}
            >
              {isPaused ? <Play className="mr-1 h-3.5 w-3.5" /> : <Pause className="mr-1 h-3.5 w-3.5" />}
              {isPaused ? "Resume Stream" : "Pause Stream"}
            </Button>

            <Button size="sm" variant="quiet" onClick={handleExportText} title="Download text log file">
              <Download className="mr-1 h-3.5 w-3.5" /> Export Log
            </Button>

            <Button
              size="sm"
              variant="quiet"
              onClick={handleCopyLogs}
              title="Copy filtered logs to clipboard"
            >
              <Copy className="mr-1 h-3.5 w-3.5" /> {copied ? "Copied!" : "Copy"}
            </Button>

            <Button size="sm" variant="quiet" onClick={handleClear} title="Clear terminal buffer">
              <Trash2 className="mr-1 h-3.5 w-3.5 text-muted-foreground hover:text-critical" />
            </Button>

            <ConnectionIndicator />
          </div>
        }
      />

      {/* Metrics Row */}
      <WidgetGrid>
        <Widget title="Total Buffer Entries" icon={<ScrollText className="h-4 w-4" />} span="quarter">
          <div className="font-mono text-2xl font-bold text-foreground">{logs.length}</div>
          <div className="text-2xs font-mono text-muted-foreground mt-1">
            Max ring capacity 500 lines
          </div>
        </Widget>

        <Widget title="Telemetry Frames" icon={<Terminal className="h-4 w-4" />} span="quarter">
          <div className="font-mono text-2xl font-bold text-cyan">{totalPackets}</div>
          <div className="text-2xs font-mono text-muted-foreground mt-1">
            Rate: {diagnostics.packetsPerSecond.toFixed(1)} pkt/sec
          </div>
        </Widget>

        <Widget title="Anomalies & Notices" icon={<AlertTriangle className="h-4 w-4" />} span="quarter">
          <div
            className={`font-mono text-2xl font-bold ${
              totalWarnings > 0 ? "text-amber" : "text-success"
            }`}
          >
            {totalWarnings}
          </div>
          <div className="text-2xs font-mono text-muted-foreground mt-1">
            {totalWarnings === 0 ? "All frames nominal" : "Review highlighted warnings"}
          </div>
        </Widget>

        <Widget title="Stream Engine Status" icon={<Radio className="h-4 w-4" />} span="quarter">
          <div className="flex items-center gap-2">
            <StatusBadge tone={isPaused ? "warn" : connection.state === "connected" ? "ok" : "crit"}>
              {isPaused ? "STREAM PAUSED" : connection.state === "connected" ? "LIVE STREAM" : "OFFLINE"}
            </StatusBadge>
          </div>
          <div className="text-2xs font-mono text-muted-foreground mt-2">
            RSSI: {data.signalStrength !== 0 ? `${data.signalStrength} dBm` : "Awaiting link"}
          </div>
        </Widget>
      </WidgetGrid>

      {/* Filter and Control Toolbar */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-1/70 p-4 backdrop-blur md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <div className="relative flex-1 md:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search logs, packet #, sensor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 font-mono text-xs h-8 bg-surface-0 border-border"
          />
        </div>

        {/* Severity Level Filter */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          <span className="text-2xs uppercase tracking-wider text-muted-foreground mr-1">Level:</span>
          {(["all", "packet", "info", "warn", "crit", "link"] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={`rounded px-2 py-1 text-2xs uppercase transition-colors cursor-pointer ${
                selectedLevel === lvl
                  ? "bg-amber text-primary-foreground font-bold shadow-sm"
                  : "bg-surface-0 text-muted-foreground hover:bg-surface-2 hover:text-foreground border border-border/50"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Subsystem Filter */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          <span className="text-2xs uppercase tracking-wider text-muted-foreground mr-1">Source:</span>
          {(["all", "telemetry", "gps", "sensors", "radio", "system"] as const).map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubsystem(sub)}
              className={`rounded px-2 py-1 text-2xs uppercase transition-colors cursor-pointer ${
                selectedSubsystem === sub
                  ? "bg-cyan text-primary-foreground font-bold shadow-sm"
                  : "bg-surface-0 text-muted-foreground hover:bg-surface-2 hover:text-foreground border border-border/50"
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* Auto Scroll Toggle */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="quiet"
            onClick={() => setAutoScroll(!autoScroll)}
            className={autoScroll ? "border-cyan/50 text-cyan" : "text-muted-foreground"}
          >
            <ArrowDown className={`mr-1 h-3.5 w-3.5 ${autoScroll ? "text-cyan" : ""}`} />
            Auto-Scroll: {autoScroll ? "ON" : "OFF"}
          </Button>
        </div>
      </div>

      {/* Main Terminal Console */}
      <Widget
        title="Live Mission Telemetry Console"
        icon={<Terminal className="h-4 w-4" />}
        span="full"
        status={
          <div className="flex items-center gap-2 font-mono text-2xs text-muted-foreground">
            <span>Showing {filteredLogs.length} of {logs.length}</span>
            <span className="inline-block h-2 w-2 rounded-full bg-success animate-pulse" />
          </div>
        }
      >
        <div
          ref={terminalRef}
          className="h-[520px] overflow-y-auto rounded-md border border-border bg-surface-0/95 p-3.5 font-mono text-xs leading-relaxed select-text space-y-1.5"
        >
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
              <ScrollText className="h-10 w-10 stroke-[1.2] opacity-40 mb-2" />
              <div className="text-sm font-semibold">No Log Messages Found</div>
              <div className="text-2xs mt-1 text-muted-foreground">
                No entries match the active filters or search terms.
              </div>
            </div>
          ) : (
            filteredLogs.map((entry) => {
              const colors = LEVEL_COLORS[entry.level];
              const isSelected = selectedEntry?.id === entry.id;

              return (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntry(isSelected ? null : entry)}
                  className={`group flex items-start gap-2.5 rounded px-2 py-1 transition-colors cursor-pointer border ${
                    isSelected
                      ? "border-amber/50 bg-amber/10"
                      : "border-transparent " + colors.bg
                  }`}
                >
                  {/* Timestamp */}
                  <span className="text-2xs text-muted-foreground tabular-nums shrink-0 pt-0.5 select-none">
                    [{entry.timeString}]
                  </span>

                  {/* Level Pill */}
                  <span
                    className={`inline-block rounded px-1.5 py-0.2 text-[10px] font-bold uppercase shrink-0 border ${colors.badge}`}
                  >
                    {entry.level}
                  </span>

                  {/* Source tag */}
                  <span className="text-2xs font-semibold text-amber shrink-0 pt-0.5">
                    {entry.sourceTag}›
                  </span>

                  {/* Message body */}
                  <span className={`flex-1 break-all ${colors.text} pt-0.5`}>
                    {entry.message}
                  </span>

                  {/* Has payload indicator */}
                  {entry.details && (
                    <span className="text-[10px] uppercase text-muted-foreground opacity-60 group-hover:opacity-100 shrink-0 pt-0.5">
                      [data]
                    </span>
                  )}
                </div>
              );
            })
          )}

          {/* Terminal Blinking Cursor */}
          <div className="pt-2 text-2xs text-muted-foreground flex items-center gap-1.5">
            <span className="text-amber font-semibold">OLDMONK-CONSOLE›</span>
            <span className="inline-block h-3.5 w-1.5 bg-cyan animate-pulse" />
          </div>
        </div>
      </Widget>

      {/* Selected Log Inspector */}
      {selectedEntry && (
        <Widget
          title={`Log Payload Inspection · ${selectedEntry.timeString}`}
          icon={<Info className="h-4 w-4" />}
          span="full"
          actions={
            <Button size="sm" variant="quiet" onClick={() => setSelectedEntry(null)}>
              Close Inspector
            </Button>
          }
        >
          <div className="space-y-3 font-mono text-xs">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-2xs">
              <div className="rounded border border-border bg-surface-1 p-2">
                <span className="text-muted-foreground block">ENTRY ID</span>
                <span className="font-bold text-foreground">{selectedEntry.id}</span>
              </div>
              <div className="rounded border border-border bg-surface-1 p-2">
                <span className="text-muted-foreground block">LEVEL / SUBSYSTEM</span>
                <span className="font-bold uppercase text-amber">
                  {selectedEntry.level} / {selectedEntry.subsystem}
                </span>
              </div>
              <div className="rounded border border-border bg-surface-1 p-2">
                <span className="text-muted-foreground block">TIMESTAMP</span>
                <span className="font-bold text-foreground">{selectedEntry.timeString}</span>
              </div>
              <div className="rounded border border-border bg-surface-1 p-2">
                <span className="text-muted-foreground block">PACKET NUMBER</span>
                <span className="font-bold text-cyan">
                  {selectedEntry.packetNo !== undefined ? `#${selectedEntry.packetNo}` : "N/A"}
                </span>
              </div>
            </div>

            <div className="rounded border border-border bg-surface-0 p-3">
              <span className="text-2xs text-muted-foreground block mb-1">RAW PAYLOAD:</span>
              <pre className="text-2xs text-foreground overflow-x-auto p-2 bg-surface-1 rounded">
                {JSON.stringify(selectedEntry.details ?? { message: selectedEntry.message }, null, 2)}
              </pre>
            </div>
          </div>
        </Widget>
      )}
    </div>
  );
}

