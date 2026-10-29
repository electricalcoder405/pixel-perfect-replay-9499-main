import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Cable,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  Copy,
  Cpu,
  ExternalLink,
  Flame,
  HelpCircle,
  Laptop,
  Layers,
  MapPin,
  Play,
  Radio,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Usb,
  Wifi,
  Zap,
} from "lucide-react";
import {
  ConnectionIndicator,
  Eyebrow,
  PageHeader,
  StatusBadge,
  Surface,
  Widget,
  WidgetGrid,
} from "@/components/ds";
import { Button } from "@/components/ui/button";
import { useTelemetrySnapshot } from "@/telemetry/hooks";
import { useTelemetryMode } from "@/telemetry/config";
import { SENSORS } from "@/telemetry/sensors";
import { cn } from "@/lib/utils";

interface SensorWiringSpec {
  sensor: string;
  chip: string;
  protocol: string;
  voltage: string;
  purpose: string;
  pins: { sensorPin: string; espPin: string; wireColor: string; notes?: string }[];
}

const WIRING_SPECS: SensorWiringSpec[] = [
  {
    sensor: "DHT11",
    chip: "Aosong DHT11",
    protocol: "Single-Wire Digital",
    voltage: "3.3V – 5.0V",
    purpose: "Atmospheric Temperature & Relative Humidity",
    pins: [
      { sensorPin: "VCC", espPin: "3.3V (or 5V)", wireColor: "Red", notes: "Power rail" },
      { sensorPin: "DATA / OUT", espPin: "GPIO 4", wireColor: "Yellow / Green", notes: "10kΩ pull-up to 3.3V" },
      { sensorPin: "NC", espPin: "No Connect", wireColor: "—", notes: "Unused pin (4-pin variants)" },
      { sensorPin: "GND", espPin: "GND", wireColor: "Black", notes: "Common ground" },
    ],
  },
  {
    sensor: "BMP280",
    chip: "Bosch Sensortec BMP280",
    protocol: "I2C (0x76 / 0x77)",
    voltage: "3.3V Only",
    purpose: "Barometric Pressure & Pressure-derived Altitude",
    pins: [
      { sensorPin: "VCC", espPin: "3.3V", wireColor: "Red", notes: "Do NOT connect to 5V (damage risk)" },
      { sensorPin: "GND", espPin: "GND", wireColor: "Black", notes: "Common ground" },
      { sensorPin: "SCL", espPin: "GPIO 22", wireColor: "Blue", notes: "I2C Clock line" },
      { sensorPin: "SDA", espPin: "GPIO 21", wireColor: "Green", notes: "I2C Data line" },
      { sensorPin: "CSB", espPin: "3.3V", wireColor: "Orange", notes: "Enables I2C mode" },
      { sensorPin: "SDO", espPin: "GND", wireColor: "Black", notes: "Sets I2C address to 0x76" },
    ],
  },
  {
    sensor: "MPU-6050",
    chip: "TDK InvenSense MPU6050",
    protocol: "I2C (0x68)",
    voltage: "3.3V (VCC onboard regulator)",
    purpose: "3-Axis Accelerometer + 3-Axis Gyroscope (Attitude)",
    pins: [
      { sensorPin: "VCC", espPin: "3.3V", wireColor: "Red", notes: "Power supply" },
      { sensorPin: "GND", espPin: "GND", wireColor: "Black", notes: "Common ground" },
      { sensorPin: "SCL", espPin: "GPIO 22", wireColor: "Blue", notes: "Shared I2C Clock with BMP280" },
      { sensorPin: "SDA", espPin: "GPIO 21", wireColor: "Green", notes: "Shared I2C Data with BMP280" },
      { sensorPin: "AD0", espPin: "GND", wireColor: "Black", notes: "Sets I2C address to 0x68" },
      { sensorPin: "INT", espPin: "NC", wireColor: "—", notes: "Interrupt pin optional" },
    ],
  },
  {
    sensor: "NEO-6M GPS",
    chip: "u-blox NEO-6M",
    protocol: "UART Serial (9600 Baud)",
    voltage: "3.3V – 5.0V (VCC)",
    purpose: "Global Positioning (Lat, Lon, Altitude, 3D Fix)",
    pins: [
      { sensorPin: "VCC", espPin: "5V (VIN) or 3.3V", wireColor: "Red", notes: "5V recommended for active antenna" },
      { sensorPin: "GND", espPin: "GND", wireColor: "Black", notes: "Common ground" },
      { sensorPin: "TXD", espPin: "GPIO 16 (RX2)", wireColor: "Yellow", notes: "Sensor TX connects to ESP32 RX" },
      { sensorPin: "RXD", espPin: "GPIO 17 (TX2)", wireColor: "White", notes: "Sensor RX connects to ESP32 TX" },
    ],
  },
];

interface TroubleshootingItem {
  id: string;
  problem: string;
  severity: "warn" | "crit" | "info";
  symptom: string;
  rootCause: string;
  solution: string[];
}

const TROUBLESHOOTING: TroubleshootingItem[] = [
  {
    id: "com-port",
    problem: "No COM Port Detected",
    severity: "crit",
    symptom: "bridge.js fails with 'Error: No such file or directory' or Ground Station shows 'Waiting for COM Port'.",
    rootCause: "USB-to-Serial UART driver (CP2102 or CH340) is not installed, or the USB cable is charge-only without data lines.",
    solution: [
      "Test with another micro-USB/Type-C cable to confirm data lines exist.",
      "Check Windows Device Manager under 'Ports (COM & LPT)' for CP210x or USB-SERIAL CH340.",
      "Install official drivers: Silicon Labs CP210x VCP or WCH CH341SER driver.",
      "If using Linux or macOS, grant dialout permissions: 'sudo usermod -a -G dialout $USER'.",
    ],
  },
  {
    id: "gps-fix",
    problem: "GPS Searching / No Position Fix",
    severity: "warn",
    symptom: "Dashboard status shows 'GPS: ACQUIRING…' or latitude/longitude reads 0.00000°.",
    rootCause: "NEO-6M ceramic patch antenna has no direct sky visibility or cold start has not completed ephemeris download.",
    solution: [
      "Move the antenna outdoors or directly beside an open window with clear sky view.",
      "Allow 2 to 5 minutes on first boot (cold start requires 30-45s minimum to lock 4+ satellites).",
      "Inspect the NEO-6M onboard LED: solid LED = searching; blinking 1Hz = 3D Carrier Lock acquired.",
      "Verify wiring: NEO-6M TXD must connect to ESP32 RX2 (GPIO 16), not TX to TX.",
    ],
  },
  {
    id: "no-packets",
    problem: "No Telemetry Packets Received",
    severity: "crit",
    symptom: "Dashboard shows 'AWAITING PACKETS' and packet count remains at 0.",
    rootCause: "ESP32 flight computer is not transmitting, or ESP-NOW WiFi channels differ between transmitter and receiver.",
    solution: [
      "Ensure transmitter and receiver both use WiFi Channel 1: 'WiFi.channel(1);'.",
      "Verify peer MAC address in the transmitter ESP32 code matches the ESP8266 receiver's MAC.",
      "Open serial monitor at 115200 baud to check if the transmitter ESP32 is printing 'Packet sent OK'.",
      "Check ground station bridge: run 'npm run bridge' and verify 'Client connected' appears.",
    ],
  },
  {
    id: "sensor-offline",
    problem: "Sensor Offline / I2C Bus Fault",
    severity: "warn",
    symptom: "One or more sensor LEDs show 'offline' (e.g. BMP280 or MPU6050 reading —).",
    rootCause: "Loose jumper wires on SDA (GPIO 21) or SCL (GPIO 22), or I2C address conflict.",
    solution: [
      "Check SDA is firmly wired to GPIO 21 and SCL to GPIO 22 on the ESP32.",
      "BMP280 default I2C address is 0x76 (SDO to GND) or 0x77 (SDO to VCC). Match this in your firmware.",
      "MPU6050 default I2C address is 0x68 (AD0 to GND).",
      "Flash an I2C scanner sketch to verify both sensors acknowledge on the bus.",
    ],
  },
  {
    id: "ws-disconnected",
    problem: "WebSocket Disconnected / Bridge Offline",
    severity: "crit",
    symptom: "Top bar shows 'DISCONNECTED' and Connection Indicator dot is red.",
    rootCause: "bridge.js process is stopped, or the port ws://localhost:8081 is blocked by local firewall.",
    solution: [
      "Open a terminal in the project directory and run: 'npm run bridge'.",
      "Verify bridge output prints: 'WebSocket Server: ws://localhost:8081'.",
      "In Mission Control TopBar, switch source to 'Ground Controller'.",
      "If running inside a VM or container, ensure port 8081 is forwarded to host.",
    ],
  },
];

export function ConnectionGuidePage() {
  const snapshot = useTelemetrySnapshot();
  const { isGroundController, isDemo, setMode } = useTelemetryMode();
  const { connection, diagnostics, sensors, data } = snapshot;

  const [expandedTroubleshoot, setExpandedTroubleshoot] = useState<string | null>("com-port");
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Compute live detection statuses
  const isWsConnected = connection.state === "connected";
  const hasPackets = diagnostics.received > 0;
  const isStreaming = diagnostics.packetsPerSecond > 0 || hasPackets;
  const hasGpsFix = Boolean(data.gpsFix);
  const onlineSensorsCount = sensors.filter((s) => s.health === "ok").length;
  const allSensorsOnline = onlineSensorsCount >= 3;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Mission Operations"
        title="Hardware Setup & Connection Guide"
        description="Comprehensive operational runbook: physical sensor pinouts, ESP32 firmware flashing, serial bridge link, and live flight telemetry verification."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={isGroundController ? "brand" : "quiet"}
              onClick={() => setMode(isGroundController ? "demo" : "ground-controller")}
            >
              {isGroundController ? (
                <>
                  <Radio className="mr-1 h-3.5 w-3.5" /> Source: Ground Controller
                </>
              ) : (
                <>
                  <Play className="mr-1 h-3.5 w-3.5" /> Source: Demo Simulator
                </>
              )}
            </Button>
            <ConnectionIndicator />
          </div>
        }
      />

      {/* Live System Detection Status Bar (TASK 4) */}
      <Surface variant="glass" padding="md" className="border-border/80 shadow-elevation-1">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 border border-border/80 text-cyan">
              <Activity className="h-4 w-4" />
            </span>
            <div>
              <div className="eyebrow text-foreground text-2xs font-bold tracking-[0.14em]">
                Live Telemetry Connection HUD
              </div>
              <div className="text-2xs text-muted-foreground font-mono mt-0.5">
                Mode: {isGroundController ? "Hardware Ground Controller" : "Internal Simulator (Demo)"}
              </div>
            </div>
          </div>

          {/* Dynamic Detection Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Bridge / WS Link */}
            <StatusBadge tone={isWsConnected ? "ok" : isGroundController ? "warn" : "ok"} pulse={isWsConnected}>
              {isWsConnected ? "✔ LINK CONNECTED" : isGroundController ? "⚠ WAITING FOR COM PORT" : "✔ DEMO ACTIVE"}
            </StatusBadge>

            {/* 2. Streaming State */}
            <StatusBadge tone={isStreaming ? "ok" : "warn"} pulse={isStreaming}>
              {isStreaming ? `✔ STREAMING (${diagnostics.packetsPerSecond.toFixed(1)}/s)` : "⚠ STREAM IDLE"}
            </StatusBadge>

            {/* 3. Sensor Health */}
            <StatusBadge tone={allSensorsOnline ? "ok" : "warn"}>
              {allSensorsOnline ? `✔ SENSORS ONLINE (${onlineSensorsCount}/${sensors.length})` : `⚠ SENSORS DEGRADED (${onlineSensorsCount}/${sensors.length})`}
            </StatusBadge>

            {/* 4. GPS Lock */}
            <StatusBadge tone={hasGpsFix ? "ok" : "warn"} pulse={hasGpsFix}>
              {hasGpsFix ? "✔ GPS 3D LOCK" : "⚠ GPS SEARCHING"}
            </StatusBadge>
          </div>
        </div>
      </Surface>

      {/* Connection Stepper Overview */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 font-mono text-xs">
        {[
          { num: "01", label: "HARDWARE", state: "done" },
          { num: "02", label: "WIRING", state: "done" },
          { num: "03", label: "FLASH ESP32", state: "done" },
          { num: "04", label: "LINK BRIDGE", state: isWsConnected ? "done" : "current" },
          { num: "05", label: "VERIFICATION", state: hasPackets ? "done" : "pending" },
          { num: "06", label: "MISSION START", state: hasPackets ? "ready" : "pending" },
        ].map((step) => (
          <div
            key={step.num}
            className={cn(
              "rounded-md border p-2.5 transition-all text-center",
              step.state === "done" && "border-success/40 bg-success/5 text-success",
              step.state === "current" && "border-amber/50 bg-amber/10 text-amber font-bold",
              step.state === "ready" && "border-cyan/50 bg-cyan/10 text-cyan font-bold",
              step.state === "pending" && "border-border/60 bg-surface-1/40 text-muted-foreground",
            )}
          >
            <div className="text-[10px] opacity-70 tracking-widest">{step.num}</div>
            <div className="font-semibold text-2xs mt-0.5">{step.label}</div>
          </div>
        ))}
      </div>

      {/* SECTION 1: Hardware Required */}
      <Widget
        title="1. Flight & Ground Hardware Specifications"
        icon={<Cpu className="h-4 w-4" />}
        span="full"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 font-mono text-xs">
          {[
            {
              title: "ESP32 Dev Module",
              role: "Flight Computer / Transmitter",
              spec: "Dual-core 240MHz, 2.4GHz ESP-NOW",
              voltage: "3.3V Logic / 5V USB in",
              badge: "CORE MCU",
            },
            {
              title: "DHT11 Sensor",
              role: "Atmospheric Probe",
              spec: "0–50°C (±2°C), 20–90% RH (±5%)",
              voltage: "3.3V – 5.0V",
              badge: "ENV",
            },
            {
              title: "BMP280 Altimeter",
              role: "Barometric Pressure & Altitude",
              spec: "300–1100 hPa (±1 hPa), 0.16m res",
              voltage: "3.3V ONLY",
              badge: "BARO",
            },
            {
              title: "MPU-6050 IMU",
              role: "6-DoF Motion & Attitude",
              spec: "±2/4/8/16g Accel, ±250/500/2000°/s Gyro",
              voltage: "3.3V",
              badge: "INERTIAL",
            },
            {
              title: "NEO-6M GNSS",
              role: "GPS Receiver Module",
              spec: "50-Channel, 2.5m CEP, 1Hz rate",
              voltage: "3.3V – 5.0V",
              badge: "GNSS",
            },
            {
              title: "USB Data Cable",
              role: "Serial Communications",
              spec: "Data + Power lines (D+ / D- / VBUS)",
              voltage: "5.0V VBUS",
              badge: "BUS",
            },
            {
              title: "ESP8266 Receiver",
              role: "Ground Station Radio Receiver",
              spec: "ESP-NOW Receiver -> Serial UART",
              voltage: "3.3V / 5V USB",
              badge: "GROUND RX",
            },
            {
              title: "Ground Station Laptop",
              role: "Mission Control Host",
              spec: "Node.js 18+, Chrome/Edge/Firefox",
              voltage: "Host OS",
              badge: "TERMINAL",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-border/70 bg-surface-1/60 p-3 flex flex-col justify-between hover:border-border transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="font-bold text-foreground text-xs">{item.title}</span>
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[9px] font-bold text-amber border border-border/40">
                    {item.badge}
                  </span>
                </div>
                <div className="text-2xs text-muted-foreground font-sans leading-tight">
                  {item.role}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-border/50 text-2xs space-y-1 text-muted-foreground">
                <div><span className="text-foreground">Spec:</span> {item.spec}</div>
                <div><span className="text-foreground">Power:</span> {item.voltage}</div>
              </div>
            </div>
          ))}
        </div>
      </Widget>

      {/* SECTION 2: Complete Wiring Diagram */}
      <Widget
        title="2. Complete Pinout & Wiring Matrix"
        icon={<Cable className="h-4 w-4" />}
        span="full"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {WIRING_SPECS.map((spec) => (
            <div
              key={spec.sensor}
              className="rounded-lg border border-border/70 bg-surface-1/70 p-4 font-mono text-xs space-y-3"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div>
                  <div className="font-bold text-foreground text-sm flex items-center gap-2">
                    {spec.sensor}
                    <span className="text-2xs font-normal text-muted-foreground">({spec.chip})</span>
                  </div>
                  <div className="text-2xs font-sans text-muted-foreground mt-0.5">
                    {spec.purpose}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xs rounded bg-surface-2 px-2 py-0.5 text-cyan border border-border/40 font-semibold">
                    {spec.protocol}
                  </span>
                  <div className="text-[10px] text-muted-foreground mt-1">Voltage: {spec.voltage}</div>
                </div>
              </div>

              {/* Pin Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-2xs text-left">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground font-semibold">
                      <th className="pb-1.5">Sensor Pin</th>
                      <th className="pb-1.5">ESP32 Pin</th>
                      <th className="pb-1.5">Color</th>
                      <th className="pb-1.5">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {spec.pins.map((pin, i) => (
                      <tr key={i} className="hover:bg-surface-2/40">
                        <td className="py-1.5 font-bold text-foreground">{pin.sensorPin}</td>
                        <td className="py-1.5 font-bold text-cyan">{pin.espPin}</td>
                        <td className="py-1.5 text-muted-foreground">{pin.wireColor}</td>
                        <td className="py-1.5 text-muted-foreground font-sans">{pin.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </Widget>

      {/* SECTION 3 & SECTION 4 */}
      <WidgetGrid>
        {/* Step 3: Flash ESP32 */}
        <Widget
          title="3. Firmware Compilation & Flashing"
          icon={<Terminal className="h-4 w-4" />}
          span="half"
        >
          <div className="space-y-3 font-mono text-xs">
            <p className="font-sans text-xs text-muted-foreground leading-relaxed">
              Upload the flight software using Arduino IDE 2.x or VS Code with PlatformIO.
              Install the required sensor libraries via Arduino Library Manager:
            </p>

            <div className="space-y-1.5 rounded-md border border-border/70 bg-surface-0 p-3 text-2xs">
              <div className="text-amber font-semibold">Required Libraries:</div>
              <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                <li><strong className="text-foreground">Adafruit_BMP280</strong> (Sensor bus I2C)</li>
                <li><strong className="text-foreground">Adafruit_MPU6050</strong> (Inertial & Gyro)</li>
                <li><strong className="text-foreground">DHT sensor library</strong> by Adafruit</li>
                <li><strong className="text-foreground">TinyGPSPlus</strong> by Mikal Hart</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-2xs text-muted-foreground">
                <span>Upload Command (esptool):</span>
                <button
                  onClick={() =>
                    handleCopy(
                      "esptool.py --chip esp32 --port COM3 --baud 921600 write_flash -z 0x1000 firmware.bin",
                      "esptool",
                    )
                  }
                  className="flex items-center gap-1 text-cyan hover:underline cursor-pointer"
                >
                  <Copy className="h-3 w-3" /> {copiedCmd === "esptool" ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="rounded bg-surface-0 p-2.5 text-2xs text-cyan overflow-x-auto border border-border/60">
                <code>esptool.py --chip esp32 --port COM3 --baud 921600 write_flash -z 0x1000 firmware.bin</code>
              </div>
            </div>
          </div>
        </Widget>

        {/* Step 4: Connect Ground Controller */}
        <Widget
          title="4. Ground Controller Serial Link Setup"
          icon={<Server className="h-4 w-4" />}
          span="half"
        >
          <div className="space-y-3 font-mono text-xs">
            <ol className="space-y-2.5 font-sans text-xs">
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber text-white font-bold text-2xs font-mono">
                  1
                </span>
                <span>Plug the ESP8266 receiver into laptop via USB cable.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber text-white font-bold text-2xs font-mono">
                  2
                </span>
                <span>Identify the serial port in Device Manager (typically <strong className="font-mono text-cyan">COM3</strong> on Windows or <strong className="font-mono text-cyan">/dev/ttyUSB0</strong> on Linux).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber text-white font-bold text-2xs font-mono">
                  3
                </span>
                <span>Confirm serial baud rate is <strong className="font-mono text-foreground">115200</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber text-white font-bold text-2xs font-mono">
                  4
                </span>
                <span>Launch the local telemetry bridge server:</span>
              </li>
            </ol>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-2xs text-muted-foreground font-mono">
                <span>Bridge Command:</span>
                <button
                  onClick={() => handleCopy("npm run bridge", "bridge")}
                  className="flex items-center gap-1 text-cyan hover:underline cursor-pointer"
                >
                  <Copy className="h-3 w-3" /> {copiedCmd === "bridge" ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="rounded bg-surface-0 p-2.5 text-2xs text-cyan overflow-x-auto border border-border/60 font-mono">
                <code>npm run bridge</code>
              </div>
            </div>
          </div>
        </Widget>
      </WidgetGrid>

      {/* SECTION 5: Verify Connection (Live Checklist) */}
      <Widget
        title="5. Connection Verification Checklist"
        icon={<ShieldCheck className="h-4 w-4" />}
        span="full"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          {[
            {
              title: "Serial Bridge Link",
              status: isWsConnected,
              detail: isWsConnected ? "WebSocket @ ws://localhost:8081 Active" : "Waiting for 'npm run bridge'",
              badge: isWsConnected ? "CONNECTED" : "OFFLINE",
            },
            {
              title: "Sensor Bus Readiness",
              status: allSensorsOnline,
              detail: `${onlineSensorsCount} of ${sensors.length} sensors communicating`,
              badge: allSensorsOnline ? "NOMINAL" : "DEGRADED",
            },
            {
              title: "GPS Constellation Lock",
              status: hasGpsFix,
              detail: hasGpsFix ? "3D Carrier Lock Active (9 Sats)" : "Acquiring GNSS Ephemeris…",
              badge: hasGpsFix ? "3D FIX" : "SEARCHING",
            },
            {
              title: "Telemetry Ingestion",
              status: hasPackets,
              detail: hasPackets ? `${diagnostics.received} frames accepted` : "Awaiting first frame…",
              badge: hasPackets ? "STREAMING" : "IDLE",
            },
          ].map((check, i) => (
            <div
              key={i}
              className={cn(
                "rounded-lg border p-3.5 flex flex-col justify-between transition-colors",
                check.status
                  ? "border-success/30 bg-success/5"
                  : "border-warning/30 bg-warning/5",
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-foreground text-xs">{check.title}</span>
                  {check.status ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  )}
                </div>
                <div className="text-2xs text-muted-foreground font-sans">
                  {check.detail}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-border/40">
                <StatusBadge tone={check.status ? "ok" : "warn"}>
                  {check.badge}
                </StatusBadge>
              </div>
            </div>
          ))}
        </div>
      </Widget>

      {/* SECTION 6: Mission Start Protocol */}
      <Widget
        title="6. Mission Flight Operations Protocol"
        icon={<Flame className="h-4 w-4" />}
        span="full"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="rounded-lg border border-border/70 bg-surface-1/60 p-4 space-y-2">
            <div className="eyebrow text-amber text-2xs font-bold">STAGE 1: PRE-FLIGHT</div>
            <div className="font-bold text-foreground text-sm font-sans">Attitude Calibration</div>
            <p className="text-2xs font-sans text-muted-foreground leading-relaxed">
              Place the CubeSat on a level surface. Verify 3D orientation in{" "}
              <strong className="text-foreground">/dashboard/satellite</strong> matches 0° Roll and 0° Pitch.
            </p>
          </div>

          <div className="rounded-lg border border-border/70 bg-surface-1/60 p-4 space-y-2">
            <div className="eyebrow text-cyan text-2xs font-bold">STAGE 2: LAUNCH READY</div>
            <div className="font-bold text-foreground text-sm font-sans">Data Recording</div>
            <p className="text-2xs font-sans text-muted-foreground leading-relaxed">
              The internal ring buffer automatically records every packet. Review live plots on{" "}
              <strong className="text-foreground">/dashboard/analytics</strong> and mission logs on{" "}
              <strong className="text-foreground">/dashboard/logs</strong>.
            </p>
          </div>

          <div className="rounded-lg border border-border/70 bg-surface-1/60 p-4 space-y-2">
            <div className="eyebrow text-success text-2xs font-bold">STAGE 3: POST-FLIGHT</div>
            <div className="font-bold text-foreground text-sm font-sans">Flight Archive Export</div>
            <p className="text-2xs font-sans text-muted-foreground leading-relaxed">
              Navigate to <strong className="text-foreground">/dashboard/history</strong> to scrub through playback
              frames or export full CSV/JSON datasets for scientific analysis.
            </p>
          </div>
        </div>
      </Widget>

      {/* SECTION 7: Troubleshooting (Expandable Accordion) */}
      <Widget
        title="7. Operational Troubleshooting & Diagnostics"
        icon={<HelpCircle className="h-4 w-4" />}
        span="full"
      >
        <div className="space-y-2 font-mono text-xs">
          {TROUBLESHOOTING.map((item) => {
            const isExpanded = expandedTroubleshoot === item.id;
            return (
              <div
                key={item.id}
                className="rounded-lg border border-border/70 bg-surface-1/60 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setExpandedTroubleshoot(isExpanded ? null : item.id)}
                  className="flex w-full items-center justify-between p-3.5 text-left cursor-pointer hover:bg-surface-2/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "flex h-2 w-2 rounded-full",
                        item.severity === "crit" ? "bg-critical" : "bg-warning",
                      )}
                    />
                    <span className="font-bold text-foreground text-xs md:text-sm">{item.problem}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={item.severity === "crit" ? "crit" : "warn"}>
                      {item.severity === "crit" ? "FAULT" : "NOTICE"}
                    </StatusBadge>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border/60 bg-surface-0/60 p-4 space-y-3 text-2xs">
                    <div>
                      <span className="font-bold text-foreground uppercase tracking-wider block mb-1">
                        Symptom:
                      </span>
                      <p className="font-sans text-muted-foreground">{item.symptom}</p>
                    </div>

                    <div>
                      <span className="font-bold text-amber uppercase tracking-wider block mb-1">
                        Probable Root Cause:
                      </span>
                      <p className="font-sans text-muted-foreground">{item.rootCause}</p>
                    </div>

                    <div>
                      <span className="font-bold text-cyan uppercase tracking-wider block mb-1">
                        Step-by-Step Fix:
                      </span>
                      <ul className="list-disc pl-4 space-y-1 font-sans text-muted-foreground">
                        {item.solution.map((sol, idx) => (
                          <li key={idx}>{sol}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Widget>
    </div>
  );
}

