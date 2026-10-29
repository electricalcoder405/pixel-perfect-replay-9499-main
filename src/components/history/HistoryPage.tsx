import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  Download,
  FastForward,
  Filter,
  FileSpreadsheet,
  FileText,
  Pause,
  Play,
  RotateCcw,
  Search,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { ConnectionIndicator, PageHeader, StatusBadge, Widget, WidgetGrid } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTelemetrySnapshot } from "@/telemetry/hooks";
import { formatValue, NO_DATA } from "@/telemetry/format";
import type { TelemetryRecord } from "@/telemetry/history";

export function HistoryPage() {
  const snapshot = useTelemetrySnapshot();
  const [records, setRecords] = useState<TelemetryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Replay player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [speed, setSpeed] = useState<number>(1);

  // Fetch recent history from API
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/telemetry/history?limit=100");
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records ?? []);
        if (data.records?.length > 0) {
          setPlaybackIndex(data.records.length - 1);
        }
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Replay timer loop
  useEffect(() => {
    if (!isPlaying || records.length === 0) return;

    const intervalTime = Math.max(100, Math.round(1000 / speed));
    const timer = setInterval(() => {
      setPlaybackIndex((prev) => {
        if (prev >= records.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPlaying, records, speed]);

  const activeRecord = records[playbackIndex];

  // Export handlers
  const handleExportCsv = () => {
    window.open("/api/telemetry/export?format=csv", "_blank");
  };

  const handleExportJson = () => {
    window.open("/api/telemetry/export?format=json", "_blank");
  };

  const filteredRecords = records.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const pktMatch = r.packetNo !== null && String(r.packetNo).includes(term);
    const dateMatch = new Date(r.receivedAt).toLocaleTimeString().toLowerCase().includes(term);
    return pktMatch || dateMatch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Data Archive"
        title="Mission History & Flight Replay"
        description="Scrub through recorded historical telemetry frames, replay dynamic mission events, and export flight records."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="quiet" onClick={handleExportCsv}>
              <FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Export CSV
            </Button>
            <Button size="sm" variant="quiet" onClick={handleExportJson}>
              <FileText className="mr-1 h-3.5 w-3.5" /> Export JSON
            </Button>
            <ConnectionIndicator />
          </div>
        }
      />

      <WidgetGrid>
        {/* Replay Controller Console */}
        <Widget
          title="Mission Telemetry Flight Replay"
          icon={<Play className="h-4 w-4" />}
          span="full"
          status={
            <StatusBadge tone={isPlaying ? "ok" : "neutral"}>
              {isPlaying ? `REPLAYING (${speed}X)` : "PAUSED"}
            </StatusBadge>
          }
        >
          <div className="space-y-4">
            {/* Scrubber slider & timeline */}
            <div className="space-y-2">
              <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
                <span>
                  FRAME {records.length > 0 ? playbackIndex + 1 : 0} OF {records.length}
                </span>
                <span>
                  {activeRecord
                    ? new Date(activeRecord.receivedAt).toLocaleTimeString()
                    : "No frames recorded"}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(0, records.length - 1)}
                value={playbackIndex}
                onChange={(e) => {
                  setPlaybackIndex(Number(e.target.value));
                  setIsPlaying(false);
                }}
                className="w-full accent-amber cursor-pointer"
              />
            </div>

            {/* Playback Transport Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="quiet"
                  onClick={() => {
                    setPlaybackIndex(0);
                    setIsPlaying(false);
                  }}
                  aria-label="Seek to start"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="brand" onClick={() => setIsPlaying(!isPlaying)}>
                  {isPlaying ? (
                    <>
                      <Pause className="mr-1 h-4 w-4" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="mr-1 h-4 w-4" /> Replay
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="quiet"
                  onClick={() => {
                    setPlaybackIndex(records.length - 1);
                    setIsPlaying(false);
                  }}
                  aria-label="Seek to end"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="quiet"
                  onClick={() => {
                    setPlaybackIndex(0);
                    setIsPlaying(false);
                  }}
                  aria-label="Reset replay"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Speed Buttons */}
              <div className="flex items-center gap-1">
                <span className="font-mono text-2xs text-muted-foreground mr-1">SPEED:</span>
                {[0.5, 1, 2, 5, 10].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpeed(s)}
                    className={`rounded px-2 py-0.5 font-mono text-2xs transition-colors ${
                      speed === s
                        ? "bg-amber text-white font-semibold"
                        : "bg-surface-1 text-muted-foreground border border-border hover:text-foreground"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Active Replay Frame Inspector Preview */}
            {activeRecord && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-lg border border-border bg-surface-1 p-3 font-mono text-xs">
                <div>
                  <span className="text-muted-foreground text-2xs block">SEQUENCE</span>
                  <span className="font-bold text-foreground">
                    #{activeRecord.packetNo ?? NO_DATA}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-2xs block">TEMP / HUMIDITY</span>
                  <span className="font-bold text-amber">
                    {formatValue(activeRecord.data.temperature)} °C /{" "}
                    {formatValue(activeRecord.data.humidity)} %
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-2xs block">PRESSURE</span>
                  <span className="font-bold text-cyan">
                    {formatValue(activeRecord.data.pressure)} hPa
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-2xs block">
                    ATTITUDE (ROLL/PITCH)
                  </span>
                  <span className="font-bold text-foreground">
                    {formatValue(activeRecord.data.roll)}° / {formatValue(activeRecord.data.pitch)}°
                  </span>
                </div>
              </div>
            )}
          </div>
        </Widget>

        {/* Historical Records Table */}
        <Widget
          title="Recorded Telemetry History Log"
          icon={<Clock className="h-4 w-4" />}
          span="full"
          actions={
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search sequence or time..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 font-mono text-xs"
              />
            </div>
          }
        >
          <div className="overflow-x-auto max-h-[380px]">
            <table className="w-full text-left font-mono text-xs">
              <thead className="sticky top-0 bg-surface-0 border-b border-border text-2xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-2">Seq #</th>
                  <th className="p-2">Received Time</th>
                  <th className="p-2">Temp (°C)</th>
                  <th className="p-2">Humidity (%)</th>
                  <th className="p-2">Pressure (hPa)</th>
                  <th className="p-2">Altitude (m)</th>
                  <th className="p-2">Accel (g)</th>
                  <th className="p-2">Roll (°)</th>
                  <th className="p-2">Pitch (°)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-muted-foreground">
                      {loading
                        ? "Loading flight history..."
                        : "No recorded telemetry frames match filter."}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r, i) => (
                    <tr
                      key={i}
                      onClick={() => setPlaybackIndex(records.indexOf(r))}
                      className={`cursor-pointer transition-colors hover:bg-surface-2 ${
                        records.indexOf(r) === playbackIndex
                          ? "bg-amber/10 border-l-2 border-l-amber"
                          : ""
                      }`}
                    >
                      <td className="p-2 font-semibold text-foreground">
                        #{r.packetNo ?? NO_DATA}
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {new Date(r.receivedAt).toLocaleTimeString()}
                      </td>
                      <td className="p-2 text-amber">{formatValue(r.data.temperature)}</td>
                      <td className="p-2 text-cyan">{formatValue(r.data.humidity)}</td>
                      <td className="p-2">{formatValue(r.data.pressure)}</td>
                      <td className="p-2">{formatValue(r.data.altitude)}</td>
                      <td className="p-2">{formatValue(r.data.accelerationZ)}</td>
                      <td className="p-2">{formatValue(r.data.roll)}</td>
                      <td className="p-2">{formatValue(r.data.pitch)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Widget>
      </WidgetGrid>
    </div>
  );
}
