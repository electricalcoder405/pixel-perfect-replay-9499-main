import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Cable,
  CheckCircle2,
  Clock,
  Cpu,
  HardDrive,
  Heart,
  HelpCircle,
  Radio,
  RefreshCw,
  Server,
  Signal,
  Terminal,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { ConnectionIndicator, PageHeader, StatusBadge, Widget, WidgetGrid } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";
import { useTelemetrySnapshot } from "@/telemetry/hooks";
import { useTelemetryMode } from "@/telemetry/config";
import { NO_DATA, formatValue } from "@/telemetry/format";
import { cn } from "@/lib/utils";

export function GroundStationPage() {
  const snapshot = useTelemetrySnapshot();
  const now = useNow(1000);
  const { mode, isGroundController, isDemo, setMode, wsUrl } = useTelemetryMode();
  const [latency, setLatency] = useState<number | null>(14);
  const [comPort, setComPort] = useState("COM3");
  const [baudRate, setBaudRate] = useState("115200");
  const [lastPing, setLastPing] = useState<number | null>(null);
  const [bridgeOnline, setBridgeOnline] = useState<boolean | null>(null);

  const { connection, diagnostics, data, available, source, history } = snapshot;

  // Signal calculations
  const rssi = available.has("signalStrength") ? data.signalStrength : null;
  const signalQuality =
    rssi !== null ? Math.max(0, Math.min(100, Math.round(((rssi + 105) / 55) * 100))) : null;

  // Ground Controller state logic
  const hasReceivedPackets = diagnostics.received > 0;
  const isWsConnected = connection.state === "connected";

  // Probe bridge health endpoint
  const checkBridge = async () => {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        setBridgeOnline(true);
      } else {
        setBridgeOnline(false);
      }
    } catch {
      setBridgeOnline(false);
    }
  };

  // Latency test
  const handlePing = () => {
    const start = performance.now();
    fetch("/api/health")
      .then((res) => {
        if (res.ok) {
          const elapsed = Math.round(performance.now() - start);
          setLatency(elapsed);
          setLastPing(Date.now());
          setBridgeOnline(true);
        } else {
          setLatency(null);
          setBridgeOnline(false);
        }
      })
      .catch(() => {
        setLatency(null);
        setBridgeOnline(false);
      });
  };

  useEffect(() => {
    handlePing();
    checkBridge();
    const interval = setInterval(() => {
      handlePing();
      checkBridge();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Compute Overall Connection Health
  let healthGrade = "NOMINAL";
  let healthTone: "ok" | "warn" | "critical" | "idle" = "ok";
  let healthScore = 100;

  if (isGroundController && !hasReceivedPackets) {
    healthGrade = "WAITING";
    healthTone = "warn";
    healthScore = 50;
  } else if (!isWsConnected && isGroundController) {
    healthGrade = "DISCONNECTED";
    healthTone = "critical";
    healthScore = 0;
  } else if (diagnostics.lossPercent > 10) {
    healthGrade = "DEGRADED";
    healthTone = "warn";
    healthScore = Math.max(20, Math.round(100 - diagnostics.lossPercent));
  } else if (connection.state === "stale") {
    healthGrade = "STALE";
    healthTone = "warn";
    healthScore = 40;
  }

  // Format last packet relative time
  const lastPacketAge =
    diagnostics.lastPacketAt !== null
      ? Math.max(0, Math.round((now.getTime() - diagnostics.lastPacketAt) / 1000))
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ground Segment"
        title="Ground Station & Link Control"
        description="Physical radio receiver, ESP8266 serial bridge, and high-frequency WebSocket transport telemetry."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="brand" onClick={handlePing}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" /> Ping Link
            </Button>
            <ConnectionIndicator />
          </div>
        }
      />

      {/* Ground Controller Waiting Notification Banner */}
      {isGroundController && !hasReceivedPackets && (
        <div className="flex items-center justify-between rounded-lg border border-amber/30 bg-amber/10 px-4 py-3 font-mono text-xs text-amber backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber" />
            </span>
            <span className="font-semibold uppercase tracking-wide">
              Waiting for Ground Controller...
            </span>
            <span className="text-muted-foreground hidden md:inline">
              (Listening on {source.label} · ESP32 ➔ ESP-NOW ➔ ESP8266 ➔ Serial ➔ bridge.js)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="quiet"
              onClick={() => setMode("demo")}
              className="h-7 px-2 font-mono text-2xs"
            >
              Switch to Demo Mode
            </Button>
          </div>
        </div>
      )}

      {/* TOP 9 CORE GROUND STATION KPIS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
        {/* 1. WebSocket Status */}
        <div className="rounded-lg border border-border bg-surface-1 p-3">
          <div className="eyebrow text-[10px] text-muted-foreground flex items-center justify-between">
            <span>WebSocket</span>
            <Wifi className="h-3.5 w-3.5 text-cyan" />
          </div>
          <div className="mt-1 font-mono text-sm font-bold capitalize text-foreground truncate">
            {connection.state}
          </div>
          <div className="mt-0.5 text-2xs text-muted-foreground truncate">{source.label}</div>
        </div>

        {/* 2. Ground Controller Status */}
        <div className="rounded-lg border border-border bg-surface-1 p-3">
          <div className="eyebrow text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Ground Controller</span>
            <Radio className="h-3.5 w-3.5 text-amber" />
          </div>
          <div className="mt-1 font-mono text-sm font-bold text-foreground truncate">
            {isGroundController ? (hasReceivedPackets ? "RECEIVING" : "WAITING...") : "DEMO MODE"}
          </div>
          <div className="mt-0.5 text-2xs text-muted-foreground">
            {isGroundController
              ? hasReceivedPackets
                ? "Live Telemetry"
                : "Awaiting Frame"
              : "Simulated Source"}
          </div>
        </div>

        {/* 3. Bridge Status */}
        <div className="rounded-lg border border-border bg-surface-1 p-3">
          <div className="eyebrow text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Bridge Process</span>
            <Server className="h-3.5 w-3.5 text-success" />
          </div>
          <div className="mt-1 font-mono text-sm font-bold text-foreground">
            {bridgeOnline !== false ? "ONLINE" : "STANDBY"}
          </div>
          <div className="mt-0.5 text-2xs text-muted-foreground">Port 8081</div>
        </div>

        {/* 4. Packet Rate */}
        <div className="rounded-lg border border-border bg-surface-1 p-3">
          <div className="eyebrow text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Packet Rate</span>
            <Activity className="h-3.5 w-3.5 text-cyan" />
          </div>
          <div className="mt-1 font-mono text-sm font-bold text-cyan">
            {diagnostics.packetsPerSecond.toFixed(1)}{" "}
            <span className="text-2xs font-normal">/s</span>
          </div>
          <div className="mt-0.5 text-2xs text-muted-foreground">Throughput</div>
        </div>

        {/* 5. Packet Count */}
        <div className="rounded-lg border border-border bg-surface-1 p-3">
          <div className="eyebrow text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Packet Count</span>
            <Zap className="h-3.5 w-3.5 text-amber" />
          </div>
          <div className="mt-1 font-mono text-sm font-bold text-foreground">
            {diagnostics.received}
          </div>
          <div className="mt-0.5 text-2xs text-muted-foreground">
            Seq #{diagnostics.lastPacketNo ?? NO_DATA}
          </div>
        </div>

        {/* 6. RSSI */}
        <div className="rounded-lg border border-border bg-surface-1 p-3">
          <div className="eyebrow text-[10px] text-muted-foreground flex items-center justify-between">
            <span>RSSI</span>
            <Signal className="h-3.5 w-3.5 text-success" />
          </div>
          <div className="mt-1 font-mono text-sm font-bold text-foreground">
            {rssi !== null ? `${rssi} dBm` : NO_DATA}
          </div>
          <div className="mt-0.5 text-2xs text-muted-foreground">
            {signalQuality !== null ? `${signalQuality}% Quality` : NO_DATA}
          </div>
        </div>

        {/* 7. Latency */}
        <div className="rounded-lg border border-border bg-surface-1 p-3">
          <div className="eyebrow text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Link Latency</span>
            <Clock className="h-3.5 w-3.5 text-cyan" />
          </div>
          <div className="mt-1 font-mono text-sm font-bold text-cyan">
            {latency !== null ? `${latency} ms` : NO_DATA}
          </div>
          <div className="mt-0.5 text-2xs text-muted-foreground">Round-trip</div>
        </div>

        {/* 8. Last Packet */}
        <div className="rounded-lg border border-border bg-surface-1 p-3">
          <div className="eyebrow text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Last Packet</span>
            <Heart className="h-3.5 w-3.5 text-amber" />
          </div>
          <div className="mt-1 font-mono text-sm font-bold text-foreground">
            {lastPacketAge !== null ? `${lastPacketAge}s ago` : NO_DATA}
          </div>
          <div className="mt-0.5 text-2xs text-muted-foreground">Heartbeat OK</div>
        </div>

        {/* 9. Connection Health */}
        <div className="rounded-lg border border-border bg-surface-1 p-3">
          <div className="eyebrow text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Link Health</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          </div>
          <div
            className={cn(
              "mt-1 font-mono text-sm font-bold",
              healthTone === "ok" && "text-success",
              healthTone === "warn" && "text-amber",
              healthTone === "critical" && "text-critical",
            )}
          >
            {healthGrade}
          </div>
          <div className="mt-0.5 text-2xs text-muted-foreground">{healthScore}% Quality</div>
        </div>
      </div>

      <WidgetGrid>
        {/* Connection Architecture Pipeline */}
        <Widget
          title="Telemetry Uplink / Downlink Pipeline"
          icon={<Cable className="h-4 w-4" />}
          span="full"
        >
          <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-5 text-center text-xs font-mono">
            <div className="rounded-lg border border-border bg-surface-1 p-3">
              <div className="flex items-center justify-center text-amber mb-1">
                <Zap className="h-5 w-5" />
              </div>
              <div className="font-semibold text-foreground">ESP32 Sensors</div>
              <div className="text-2xs text-muted-foreground mt-0.5">DHT11, BMP280, MPU, GPS</div>
              <div className="mt-2 text-2xs text-success">
                {available.size > 0 ? "TRANSMITTING" : "STANDBY"}
              </div>
            </div>

            <div className="text-center font-bold text-amber hidden md:block">─ ESP-NOW ➔</div>

            <div className="rounded-lg border border-border bg-surface-1 p-3">
              <div className="flex items-center justify-center text-cyan mb-1">
                <Radio className="h-5 w-5" />
              </div>
              <div className="font-semibold text-foreground">ESP8266 Receiver</div>
              <div className="text-2xs text-muted-foreground mt-0.5">2.4 GHz Promiscuous</div>
              <div className="mt-2 text-2xs text-cyan">
                {isWsConnected ? "LINKED" : "AWAITING LINK"}
              </div>
            </div>

            <div className="text-center font-bold text-cyan hidden md:block">─ Serial / USB ➔</div>

            <div className="rounded-lg border border-border bg-surface-1 p-3">
              <div className="flex items-center justify-center text-amber mb-1">
                <Server className="h-5 w-5" />
              </div>
              <div className="font-semibold text-foreground">bridge.js + WebSocket</div>
              <div className="text-2xs text-muted-foreground mt-0.5">{wsUrl}</div>
              <div className="mt-2 text-2xs text-success">
                {isWsConnected ? (hasReceivedPackets ? "STREAMING" : "LISTENING") : "CONNECTING"}
              </div>
            </div>
          </div>
        </Widget>

        {/* WebSocket Transport Details */}
        <Widget
          title="WebSocket Transport & Link State"
          icon={<Wifi className="h-4 w-4" />}
          span="half"
          status={
            <StatusBadge tone={isWsConnected ? "ok" : "warn"}>
              {connection.state.toUpperCase()}
            </StatusBadge>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-md border border-border bg-surface-1 p-3">
                <span className="eyebrow text-2xs">Link State</span>
                <div className="mt-1 font-mono text-lg font-bold text-foreground capitalize">
                  {connection.state}
                </div>
                <div className="text-2xs text-muted-foreground mt-0.5">
                  {connection.detail ?? "Connected to telemetry provider"}
                </div>
              </div>

              <div className="rounded-md border border-border bg-surface-1 p-3">
                <span className="eyebrow text-2xs">Transport Latency</span>
                <div className="mt-1 font-mono text-lg font-bold text-cyan">
                  {latency !== null ? `${latency} ms` : NO_DATA}
                </div>
                <div className="text-2xs text-muted-foreground mt-0.5">
                  {lastPing
                    ? `Checked ${Math.round((now.getTime() - lastPing) / 1000)}s ago`
                    : "Measuring..."}
                </div>
              </div>
            </div>

            <dl className="space-y-2 border-t border-border/60 pt-3 text-xs font-mono">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Endpoint:</dt>
                <dd className="text-foreground">{source.label}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Protocol:</dt>
                <dd className="text-foreground">RFC 6455 / JSON Frame</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Active Mission Mode:</dt>
                <dd className="font-semibold text-amber">
                  {isGroundController ? "Ground Controller (Live)" : "Demo (Simulator)"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Heartbeat Status:</dt>
                <dd className="flex items-center gap-1.5 text-success">
                  <Heart className="h-3.5 w-3.5 fill-success animate-pulse" /> Active (5s
                  keep-alive)
                </dd>
              </div>
            </dl>
          </div>
        </Widget>

        {/* COM Port & Serial Hardware Bridge */}
        <Widget
          title="Hardware COM Port (Receiver Interface)"
          icon={<HardDrive className="h-4 w-4" />}
          span="half"
          status={<StatusBadge tone="ok">SERIAL READY</StatusBadge>}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-md border border-border bg-surface-1 p-3">
                <label htmlFor="com-port-select" className="eyebrow text-2xs block">
                  Assigned Serial Port
                </label>
                <select
                  id="com-port-select"
                  value={comPort}
                  onChange={(e) => setComPort(e.target.value)}
                  className="mt-1 w-full rounded border border-border bg-surface-0 px-2 py-1 font-mono text-sm text-foreground"
                >
                  <option value="COM1">COM1 (System Port)</option>
                  <option value="COM3">COM3 (ESP8266 CH340 / CP2102)</option>
                  <option value="COM4">COM4 (USB Serial)</option>
                  <option value="/dev/ttyUSB0">/dev/ttyUSB0 (Linux)</option>
                  <option value="/dev/ttyACM0">/dev/ttyACM0 (macOS/Linux)</option>
                </select>
                <div className="text-2xs text-muted-foreground mt-1">
                  Direct USB receiver interface
                </div>
              </div>

              <div className="rounded-md border border-border bg-surface-1 p-3">
                <label htmlFor="baud-rate-select" className="eyebrow text-2xs block">
                  Baud Rate
                </label>
                <select
                  id="baud-rate-select"
                  value={baudRate}
                  onChange={(e) => setBaudRate(e.target.value)}
                  className="mt-1 w-full rounded border border-border bg-surface-0 px-2 py-1 font-mono text-sm text-foreground"
                >
                  <option value="9600">9600 bps</option>
                  <option value="57600">57600 bps</option>
                  <option value="115200">115200 bps (Standard)</option>
                  <option value="921600">921600 bps (High Speed)</option>
                </select>
                <div className="text-2xs text-muted-foreground mt-1">
                  8 data bits, no parity, 1 stop bit
                </div>
              </div>
            </div>

            <dl className="space-y-2 border-t border-border/60 pt-3 text-xs font-mono">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Bridge Script:</dt>
                <dd className="text-foreground">npm run bridge (node bridge.js)</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Serial Mode:</dt>
                <dd className="text-foreground">Asynchronous Non-blocking Polling</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Receiver Hardware:</dt>
                <dd className="text-amber">ESP8266 NodeMCU / ESP-12F</dd>
              </div>
            </dl>
          </div>
        </Widget>

        {/* Packet Telemetry & Loss Statistics */}
        <Widget
          title="Packet Counters & Data Integrity"
          icon={<Activity className="h-4 w-4" />}
          span="half"
        >
          <div className="space-y-3 font-mono">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded border border-border bg-surface-1 p-2 text-center">
                <div className="eyebrow text-2xs">Accepted</div>
                <div className="text-xl font-bold text-foreground mt-1">{diagnostics.received}</div>
              </div>
              <div className="rounded border border-border bg-surface-1 p-2 text-center">
                <div className="eyebrow text-2xs">Packet Rate</div>
                <div className="text-xl font-bold text-cyan mt-1">
                  {diagnostics.packetsPerSecond.toFixed(1)}{" "}
                  <span className="text-xs font-normal">/s</span>
                </div>
              </div>
              <div className="rounded border border-border bg-surface-1 p-2 text-center">
                <div className="eyebrow text-2xs">Packet Loss</div>
                <div className="text-xl font-bold text-amber mt-1">
                  {diagnostics.lossPercent.toFixed(1)}{" "}
                  <span className="text-xs font-normal">%</span>
                </div>
              </div>
            </div>

            <dl className="space-y-1.5 text-xs pt-2">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Last Received Sequence:</dt>
                <dd className="text-foreground font-semibold">
                  #{diagnostics.lastPacketNo ?? NO_DATA}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Missed Sequence Numbers:</dt>
                <dd className="text-foreground">{diagnostics.missed}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Checksum / JSON Validation Errors:</dt>
                <dd
                  className={
                    diagnostics.invalid > 0 ? "text-critical font-bold" : "text-foreground"
                  }
                >
                  {diagnostics.invalid}
                </dd>
              </div>
            </dl>
          </div>
        </Widget>

        {/* Radio Link Signal & RSSI */}
        <Widget
          title="ESP-NOW Radio Frequency Link"
          icon={<Signal className="h-4 w-4" />}
          span="half"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="eyebrow text-2xs">Received Signal Strength (RSSI)</span>
                <div className="text-2xl font-mono font-bold text-foreground mt-1">
                  {rssi !== null ? `${rssi} dBm` : NO_DATA}
                </div>
              </div>
              <div className="text-right">
                <span className="eyebrow text-2xs">Link Quality</span>
                <div className="text-2xl font-mono font-bold text-amber mt-1">
                  {signalQuality !== null ? `${signalQuality}%` : NO_DATA}
                </div>
              </div>
            </div>

            {/* Signal Quality Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-2xs font-mono text-muted-foreground">
                <span>Poor (-100 dBm)</span>
                <span>Marginal (-75 dBm)</span>
                <span>Optimal (-50 dBm)</span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full bg-gradient-to-r from-critical via-amber to-success transition-all duration-500"
                  style={{ width: `${signalQuality ?? 0}%` }}
                />
              </div>
            </div>

            <dl className="space-y-1.5 text-xs font-mono pt-1">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Band / Protocol:</dt>
                <dd className="text-foreground">2.4 GHz ISM / IEEE 802.11 Wi-Fi Promiscuous</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Antenna Link:</dt>
                <dd className="text-success">Omnidirectional 3dBi Dipole</dd>
              </div>
            </dl>
          </div>
        </Widget>

        {/* Live Packet Frame Inspector */}
        <Widget
          title="Live Raw Telemetry Feed (Recent Frames)"
          icon={<Terminal className="h-4 w-4" />}
          span="full"
        >
          {history.length === 0 ? (
            <div className="py-8 text-center font-mono text-xs text-muted-foreground">
              {isGroundController
                ? "Waiting for incoming packets from Ground Controller receiver..."
                : "No telemetry packets received yet."}
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto font-mono text-xs space-y-1">
              {history
                .slice(-8)
                .reverse()
                .map((pt, idx) => (
                  <div
                    key={`${pt.ts}-${idx}`}
                    className="flex items-center justify-between rounded bg-surface-1 px-3 py-1.5 border border-border/40 hover:bg-surface-2 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground text-2xs">
                        {new Date(pt.ts).toLocaleTimeString()}
                      </span>
                      <span className="text-amber font-semibold">
                        PKT #{diagnostics.lastPacketNo ? diagnostics.lastPacketNo - idx : idx + 1}
                      </span>
                      <span className="text-foreground">
                        T: {pt.temperature?.toFixed(1) ?? "--"}°C | P:{" "}
                        {pt.pressure?.toFixed(1) ?? "--"} hPa | H: {pt.humidity?.toFixed(1) ?? "--"}
                        %
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-2xs text-muted-foreground">
                      <span>Ax: {pt.ax?.toFixed(2) ?? "--"}</span>
                      <span>Ay: {pt.ay?.toFixed(2) ?? "--"}</span>
                      <span>Az: {pt.az?.toFixed(2) ?? "--"}</span>
                      <span className="text-success">CRC OK</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Widget>
      </WidgetGrid>
    </div>
  );
}
