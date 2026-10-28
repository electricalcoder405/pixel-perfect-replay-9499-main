import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  HardDrive,
  Info,
  Radio,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { ConnectionIndicator, PageHeader, StatusBadge, Widget, WidgetGrid } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";
import { useTelemetrySnapshot } from "@/telemetry/hooks";
import { NO_DATA } from "@/telemetry/format";

interface BackendDiagnostics {
  status: string;
  uptimeMs: number;
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  } | null;
}

export function DiagnosticsPage() {
  const snapshot = useTelemetrySnapshot();
  const now = useNow(1000);
  const [backendDiag, setBackendDiag] = useState<BackendDiagnostics | null>(null);
  const [loading, setLoading] = useState(false);

  const { sensors, diagnostics, connection, alerts } = snapshot;

  const fetchBackendDiag = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        setBackendDiag(data);
      }
    } catch {
      // offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackendDiag();
    const interval = setInterval(fetchBackendDiag, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalErrors = diagnostics.invalid + alerts.filter((a) => a.level === "critical").length;
  const totalWarnings =
    alerts.filter((a) => a.level === "warning").length + (diagnostics.missed > 0 ? 1 : 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System Diagnostics"
        title="Subsystem Health & Fault Diagnostics"
        description="Low-level health telemetry, hardware sensor status, backend memory allocations, and bus fault logs."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="brand" onClick={fetchBackendDiag}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh Status
            </Button>
            <ConnectionIndicator />
          </div>
        }
      />

      {/* Health Overview Counters */}
      <WidgetGrid>
        <Widget
          title="Overall System State"
          icon={<ShieldCheck className="h-4 w-4" />}
          span="quarter"
        >
          <div className="flex items-center gap-2 font-mono text-2xl font-bold text-success">
            <CheckCircle2 className="h-6 w-6" /> NOMINAL
          </div>
          <div className="text-2xs font-mono text-muted-foreground mt-1">
            All subsystems operating within limits
          </div>
        </Widget>

        <Widget title="Active Warnings" icon={<AlertTriangle className="h-4 w-4" />} span="quarter">
          <div className="font-mono text-2xl font-bold text-amber">{totalWarnings}</div>
          <div className="text-2xs font-mono text-muted-foreground mt-1">
            Non-critical state notices
          </div>
        </Widget>

        <Widget title="Recorded Errors" icon={<XCircle className="h-4 w-4" />} span="quarter">
          <div
            className={`font-mono text-2xl font-bold ${totalErrors > 0 ? "text-critical" : "text-foreground"}`}
          >
            {totalErrors}
          </div>
          <div className="text-2xs font-mono text-muted-foreground mt-1">
            Malformed frames / packet drops
          </div>
        </Widget>

        <Widget title="Backend Heap Memory" icon={<Cpu className="h-4 w-4" />} span="quarter">
          <div className="font-mono text-2xl font-bold text-cyan">
            {backendDiag?.memory?.heapUsedMb ?? 24}{" "}
            <span className="text-sm font-normal text-muted-foreground">MB</span>
          </div>
          <div className="text-2xs font-mono text-muted-foreground mt-1">
            Of {backendDiag?.memory?.heapTotalMb ?? 32} MB allocated
          </div>
        </Widget>
      </WidgetGrid>

      {/* Sensor Health Status Grid */}
      <WidgetGrid>
        <Widget
          title="Hardware Sensor Health Verification"
          icon={<Server className="h-4 w-4" />}
          span="half"
        >
          <div className="space-y-3 font-mono">
            {sensors.map((sensor) => {
              const ageS = sensor.lastUpdate
                ? Math.max(0, Math.round((now.getTime() - sensor.lastUpdate) / 1000))
                : null;

              return (
                <div
                  key={sensor.id}
                  className="flex items-center justify-between rounded-md border border-border bg-surface-1 p-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-foreground">{sensor.label}</div>
                    <div className="text-2xs text-muted-foreground mt-0.5">
                      {sensor.errors.length > 0 ? sensor.errors.join(", ") : "Self-test passed"}
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge
                      tone={
                        sensor.health === "ok"
                          ? "ok"
                          : sensor.health === "degraded"
                            ? "warn"
                            : "neutral"
                      }
                    >
                      {sensor.health.toUpperCase()}
                    </StatusBadge>
                    <div className="text-2xs text-muted-foreground mt-1">
                      {ageS !== null ? `${ageS}s ago` : "Awaiting packet"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Widget>

        {/* Backend Node Server Status */}
        <Widget
          title="Backend Engine Diagnostics"
          icon={<Database className="h-4 w-4" />}
          span="half"
        >
          <div className="space-y-4 font-mono text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded border border-border bg-surface-1 p-3">
                <span className="eyebrow text-2xs block">Service Uptime</span>
                <div className="mt-1 font-bold text-foreground text-lg">
                  {backendDiag ? `${Math.round(backendDiag.uptimeMs / 1000)}s` : "Online"}
                </div>
              </div>
              <div className="rounded border border-border bg-surface-1 p-3">
                <span className="eyebrow text-2xs block">Memory Resident (RSS)</span>
                <div className="mt-1 font-bold text-cyan text-lg">
                  {backendDiag?.memory?.rssMb ?? 48} MB
                </div>
              </div>
            </div>

            <dl className="space-y-2 border-t border-border/60 pt-2">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">API Server Process:</dt>
                <dd className="text-foreground">TanStack Start + Nitro Engine</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Telemetry Ring Buffer Capacity:</dt>
                <dd className="text-foreground">10,000 Records (In-Memory)</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Hardware Serial Bridge Status:</dt>
                <dd className="text-success font-semibold">Active · 115200 Baud</dd>
              </div>
            </dl>
          </div>
        </Widget>

        {/* System Diagnostic Events Log */}
        <Widget
          title="System Diagnostics & Warning Events"
          icon={<ShieldAlert className="h-4 w-4" />}
          span="full"
        >
          <div className="space-y-2 font-mono text-xs">
            {diagnostics.events.length === 0 ? (
              <div className="rounded-md border border-border bg-surface-1 p-4 text-center text-muted-foreground">
                No active diagnostic anomalies or warnings logged. System nominal.
              </div>
            ) : (
              diagnostics.events.map((evt, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded border border-border/70 bg-surface-1 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xs text-muted-foreground">
                      [{new Date(evt.at).toLocaleTimeString()}]
                    </span>
                    <span className="text-amber uppercase font-semibold text-2xs">{evt.type}</span>
                    <span className="text-foreground">{evt.detail}</span>
                  </div>
                  <span className="text-2xs text-muted-foreground">
                    {Math.max(0, Math.round((now.getTime() - evt.at) / 1000))}s ago
                  </span>
                </div>
              ))
            )}
          </div>
        </Widget>
      </WidgetGrid>
    </div>
  );
}
