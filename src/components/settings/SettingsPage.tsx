import { useRef, useState } from "react";
import {
  Activity,
  Check,
  Cpu,
  Download,
  Gauge,
  HardDrive,
  Heart,
  Moon,
  Radio,
  RefreshCw,
  Save,
  Sliders,
  Sun,
  Timer,
  Upload,
  Wifi,
  Zap,
} from "lucide-react";
import { ConnectionIndicator, PageHeader, StatusBadge, Widget, WidgetGrid } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_WS_URL,
  type TelemetryMode,
  type TelemetrySettings,
  useTelemetryMode,
} from "@/telemetry/config";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function SettingsPage() {
  const { settings, mode, isDemo, isGroundController, setMode, updateSettings } =
    useTelemetryMode();

  // Local form state
  const [formMode, setFormMode] = useState<TelemetryMode>(mode);
  const [wsUrl, setWsUrl] = useState(settings.url);
  const [heartbeatInterval, setHeartbeatInterval] = useState(settings.heartbeatIntervalMs);
  const [staleTimeout, setStaleTimeout] = useState(settings.staleTimeoutMs);
  const [backoffBase, setBackoffBase] = useState(settings.backoffBaseMs);
  const [simRate, setSimRate] = useState(settings.simRate);
  const [simNoise, setSimNoise] = useState(settings.simNoise);
  const [tempUnit, setTempUnit] = useState(settings.units.temp);
  const [accelUnit, setAccelUnit] = useState(settings.units.accel);
  const [altUnit, setAltUnit] = useState(settings.units.altitude);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync when global mode changes outside (e.g. from TopBar)
  if (mode !== formMode) {
    setFormMode(mode);
  }

  const handleSaveSettings = () => {
    updateSettings({
      mode: formMode,
      url: wsUrl.trim() || DEFAULT_WS_URL,
      heartbeatIntervalMs: Number(heartbeatInterval) || 5000,
      staleTimeoutMs: Number(staleTimeout) || 10000,
      backoffBaseMs: Number(backoffBase) || 1000,
      simRate: Number(simRate) || 1.0,
      simNoise,
      units: {
        temp: tempUnit,
        accel: accelUnit,
        altitude: altUnit,
      },
    });
    toast.success("Telemetry settings updated successfully.");
  };

  const handleModeToggle = (nextMode: TelemetryMode) => {
    setFormMode(nextMode);
    setMode(nextMode, wsUrl);
    toast.success(
      `Switched to ${nextMode === "ground-controller" ? "Ground Controller (Live)" : "Demo (Simulator)"} Mode`,
    );
  };

  const handleExportConfig = () => {
    const config = {
      telemetryMode: formMode,
      wsUrl,
      reconnect: {
        heartbeatIntervalMs: heartbeatInterval,
        staleTimeoutMs: staleTimeout,
        backoffBaseMs: backoffBase,
      },
      simulator: {
        rate: simRate,
        noise: simNoise,
      },
      units: {
        temp: tempUnit,
        accel: accelUnit,
        altitude: altUnit,
      },
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oldmonk-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Mission configuration profile exported.");
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed.telemetryMode) setFormMode(parsed.telemetryMode);
        if (parsed.wsUrl) setWsUrl(parsed.wsUrl);
        if (parsed.reconnect?.heartbeatIntervalMs)
          setHeartbeatInterval(parsed.reconnect.heartbeatIntervalMs);
        if (parsed.reconnect?.staleTimeoutMs) setStaleTimeout(parsed.reconnect.staleTimeoutMs);
        if (parsed.reconnect?.backoffBaseMs) setBackoffBase(parsed.reconnect.backoffBaseMs);
        if (parsed.simulator?.rate) setSimRate(parsed.simulator.rate);
        if (parsed.simulator?.noise) setSimNoise(parsed.simulator.noise);
        if (parsed.units?.temp) setTempUnit(parsed.units.temp);
        if (parsed.units?.accel) setAccelUnit(parsed.units.accel);
        if (parsed.units?.altitude) setAltUnit(parsed.units.altitude);

        updateSettings({
          mode: parsed.telemetryMode ?? formMode,
          url: parsed.wsUrl ?? wsUrl,
          heartbeatIntervalMs: parsed.reconnect?.heartbeatIntervalMs ?? heartbeatInterval,
          staleTimeoutMs: parsed.reconnect?.staleTimeoutMs ?? staleTimeout,
          backoffBaseMs: parsed.reconnect?.backoffBaseMs ?? backoffBase,
          simRate: parsed.simulator?.rate ?? simRate,
          simNoise: parsed.simulator?.noise ?? simNoise,
          units: {
            temp: parsed.units?.temp ?? tempUnit,
            accel: parsed.units?.accel ?? accelUnit,
            altitude: parsed.units?.altitude ?? altUnit,
          },
        });
        toast.success("Configuration imported successfully.");
      } catch (err) {
        toast.error("Invalid configuration JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleResetDefaults = () => {
    setFormMode("demo");
    setWsUrl(DEFAULT_WS_URL);
    setHeartbeatInterval(5000);
    setStaleTimeout(10000);
    setBackoffBase(1000);
    setSimRate(1.0);
    setSimNoise("low");
    setTempUnit("C");
    setAccelUnit("g");
    setAltUnit("m");
    updateSettings({
      mode: "demo",
      url: DEFAULT_WS_URL,
      heartbeatIntervalMs: 5000,
      staleTimeoutMs: 10000,
      backoffBaseMs: 1000,
      simRate: 1.0,
      simNoise: "low",
      units: { temp: "C", accel: "g", altitude: "m" },
    });
    toast.info("Settings restored to factory defaults.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System Configuration"
        title="Mission Control Settings"
        description="Configure hardware data links, WebSocket bridge endpoints, measurement units, and simulation behavior."
        actions={<ConnectionIndicator />}
      />

      <WidgetGrid>
        {/* Telemetry Mode Selector (Demo vs Ground Controller) */}
        <Widget
          title="Active Telemetry Mode"
          icon={<Radio className="h-4 w-4" />}
          span="full"
          status={
            <StatusBadge tone={isGroundController ? "ok" : "warn"}>
              {isGroundController ? "GROUND CONTROLLER" : "DEMO SIMULATOR"}
            </StatusBadge>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Ground Controller Mode */}
              <button
                type="button"
                onClick={() => handleModeToggle("ground-controller")}
                className={cn(
                  "rounded-lg border p-4 text-left transition-all",
                  formMode === "ground-controller"
                    ? "border-cyan bg-cyan/10 ring-1 ring-cyan"
                    : "border-border bg-surface-1 hover:bg-surface-2 opacity-75 hover:opacity-100",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        formMode === "ground-controller"
                          ? "bg-cyan animate-pulse"
                          : "bg-muted-foreground",
                      )}
                    />
                    <span className="font-mono text-sm font-bold text-foreground">
                      Ground Controller Mode
                    </span>
                  </div>
                  {formMode === "ground-controller" && <StatusBadge tone="ok">ACTIVE</StatusBadge>}
                </div>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Used during the real ORBITRA competition. Consumes live telemetry exclusively from
                  the ESP8266 receiver via bridge.js. Never invents values; displays &ldquo;Waiting
                  for Ground Controller...&rdquo; if data is unavailable.
                </p>
                <div className="mt-3 font-mono text-2xs text-cyan">
                  ESP32 ➔ ESP-NOW ➔ ESP8266 ➔ Serial ➔ bridge.js ➔ WebSocket
                </div>
              </button>

              {/* Demo Mode */}
              <button
                type="button"
                onClick={() => handleModeToggle("demo")}
                className={cn(
                  "rounded-lg border p-4 text-left transition-all",
                  formMode === "demo"
                    ? "border-amber bg-amber/10 ring-1 ring-amber"
                    : "border-border bg-surface-1 hover:bg-surface-2 opacity-75 hover:opacity-100",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        formMode === "demo" ? "bg-amber" : "bg-muted-foreground",
                      )}
                    />
                    <span className="font-mono text-sm font-bold text-foreground">
                      Demo Mode (Simulator)
                    </span>
                  </div>
                  {formMode === "demo" && <StatusBadge tone="warn">ACTIVE</StatusBadge>}
                </div>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Used for presentations, development, UI showcasing, and testing. Generates
                  realistic physics telemetry internally. No hardware receiver required.
                </p>
                <div className="mt-3 font-mono text-2xs text-amber">
                  Internal Synthetic Telemetry Generator
                </div>
              </button>
            </div>
          </div>
        </Widget>

        {/* WebSocket & Reconnection Settings */}
        <Widget
          title="WebSocket Transport & Reconnection"
          icon={<Wifi className="h-4 w-4" />}
          span="half"
        >
          <div className="space-y-4 font-mono text-xs">
            <div>
              <label htmlFor="ws-url-input" className="text-muted-foreground block mb-1">
                WebSocket Bridge Endpoint URL
              </label>
              <Input
                id="ws-url-input"
                value={wsUrl}
                onChange={(e) => setWsUrl(e.target.value)}
                placeholder="ws://localhost:8081"
                className="font-mono text-xs"
              />
              <span className="text-2xs text-muted-foreground mt-0.5 block">
                Standard bridge server port: 8081 (RFC 6455)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="heartbeat-interval-input"
                  className="text-muted-foreground block mb-1"
                >
                  Heartbeat Ping (ms)
                </label>
                <Input
                  id="heartbeat-interval-input"
                  type="number"
                  value={heartbeatInterval}
                  onChange={(e) => setHeartbeatInterval(Number(e.target.value))}
                  min={1000}
                  step={1000}
                  className="font-mono text-xs"
                />
                <span className="text-2xs text-muted-foreground">Keep-alive frequency</span>
              </div>

              <div>
                <label htmlFor="stale-timeout-input" className="text-muted-foreground block mb-1">
                  Stale Timeout (ms)
                </label>
                <Input
                  id="stale-timeout-input"
                  type="number"
                  value={staleTimeout}
                  onChange={(e) => setStaleTimeout(Number(e.target.value))}
                  min={2000}
                  step={1000}
                  className="font-mono text-xs"
                />
                <span className="text-2xs text-muted-foreground">Threshold for lost link</span>
              </div>
            </div>

            <div>
              <label htmlFor="backoff-base-input" className="text-muted-foreground block mb-1">
                Reconnect Backoff Delay (ms)
              </label>
              <Input
                id="backoff-base-input"
                type="number"
                value={backoffBase}
                onChange={(e) => setBackoffBase(Number(e.target.value))}
                min={500}
                step={500}
                className="font-mono text-xs"
              />
              <span className="text-2xs text-muted-foreground">Initial reconnect delay</span>
            </div>

            <Button variant="brand" onClick={handleSaveSettings} className="w-full mt-2">
              <Save className="mr-1.5 h-4 w-4" /> Save Link Settings
            </Button>
          </div>
        </Widget>

        {/* Simulator Speed & Noise Controls */}
        <Widget title="Telemetry Simulator Controls" icon={<Cpu className="h-4 w-4" />} span="half">
          <div className="space-y-4 font-mono text-xs">
            <div>
              <label className="text-muted-foreground block mb-1.5">
                Simulation Speed Multiplier
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[0.5, 1.0, 2.0, 5.0, 10.0].map((rate) => (
                  <Button
                    key={rate}
                    size="sm"
                    variant={simRate === rate ? "brand" : "quiet"}
                    onClick={() => {
                      setSimRate(rate);
                      updateSettings({ simRate: rate });
                    }}
                    className="font-mono text-xs"
                  >
                    {rate}x
                  </Button>
                ))}
              </div>
              <span className="text-2xs text-muted-foreground mt-1 block">
                Controls frequency of synthetic orbital physics frames
              </span>
            </div>

            <div>
              <label className="text-muted-foreground block mb-1.5">Sensor Noise & Drift</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(["none", "low", "medium", "high"] as const).map((lvl) => (
                  <Button
                    key={lvl}
                    size="sm"
                    variant={simNoise === lvl ? "brand" : "quiet"}
                    onClick={() => {
                      setSimNoise(lvl);
                      updateSettings({ simNoise: lvl });
                    }}
                    className="font-mono text-xs capitalize"
                  >
                    {lvl}
                  </Button>
                ))}
              </div>
              <span className="text-2xs text-muted-foreground mt-1 block">
                Gaussian jitter applied to simulated IMU and barometric readings
              </span>
            </div>

            <div className="rounded-md border border-border bg-surface-1 p-3 text-2xs text-muted-foreground">
              Note: Simulator parameters only affect Demo Mode. Ground Controller mode uses pure
              hardware packets from bridge.js.
            </div>
          </div>
        </Widget>

        {/* Engineering Units & Conversions */}
        <Widget
          title="Engineering Units & Display Preferences"
          icon={<Sliders className="h-4 w-4" />}
          span="half"
        >
          <div className="space-y-4 font-mono text-xs">
            <div>
              <label className="eyebrow text-2xs block mb-1">Temperature Unit</label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={tempUnit === "C" ? "brand" : "quiet"}
                  onClick={() => {
                    setTempUnit("C");
                    updateSettings({ units: { ...settings.units, temp: "C" } });
                  }}
                  className="flex-1"
                >
                  Celsius (°C)
                </Button>
                <Button
                  size="sm"
                  variant={tempUnit === "F" ? "brand" : "quiet"}
                  onClick={() => {
                    setTempUnit("F");
                    updateSettings({ units: { ...settings.units, temp: "F" } });
                  }}
                  className="flex-1"
                >
                  Fahrenheit (°F)
                </Button>
              </div>
            </div>

            <div>
              <label className="eyebrow text-2xs block mb-1">Acceleration Unit</label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={accelUnit === "g" ? "brand" : "quiet"}
                  onClick={() => {
                    setAccelUnit("g");
                    updateSettings({ units: { ...settings.units, accel: "g" } });
                  }}
                  className="flex-1"
                >
                  Standard Gravity (g)
                </Button>
                <Button
                  size="sm"
                  variant={accelUnit === "ms2" ? "brand" : "quiet"}
                  onClick={() => {
                    setAccelUnit("ms2");
                    updateSettings({ units: { ...settings.units, accel: "ms2" } });
                  }}
                  className="flex-1"
                >
                  Meters / Second² (m/s²)
                </Button>
              </div>
            </div>

            <div>
              <label className="eyebrow text-2xs block mb-1">Altitude Unit</label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={altUnit === "m" ? "brand" : "quiet"}
                  onClick={() => {
                    setAltUnit("m");
                    updateSettings({ units: { ...settings.units, altitude: "m" } });
                  }}
                  className="flex-1"
                >
                  Meters (m)
                </Button>
                <Button
                  size="sm"
                  variant={altUnit === "ft" ? "brand" : "quiet"}
                  onClick={() => {
                    setAltUnit("ft");
                    updateSettings({ units: { ...settings.units, altitude: "ft" } });
                  }}
                  className="flex-1"
                >
                  Feet (ft)
                </Button>
              </div>
            </div>
          </div>
        </Widget>

        {/* Configuration Backup, Export & Factory Reset */}
        <Widget
          title="Configuration Backup & Profile Management"
          icon={<HardDrive className="h-4 w-4" />}
          span="half"
        >
          <div className="space-y-4 font-mono text-xs">
            <div>
              <div className="font-semibold text-foreground text-sm">Mission Profile File</div>
              <div className="text-2xs text-muted-foreground mt-0.5">
                Export or import serialized JSON mission settings to quickly duplicate ground
                station configurations.
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".json,application/json"
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button size="sm" variant="quiet" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-1.5 h-3.5 w-3.5" /> Import Profile
              </Button>
              <Button size="sm" variant="quiet" onClick={handleExportConfig}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Export Profile
              </Button>
            </div>

            <div className="border-t border-border/60 pt-3">
              <Button
                size="sm"
                variant="quiet"
                onClick={handleResetDefaults}
                className="w-full text-critical hover:text-critical"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Restore Factory Defaults
              </Button>
            </div>
          </div>
        </Widget>
      </WidgetGrid>
    </div>
  );
}
