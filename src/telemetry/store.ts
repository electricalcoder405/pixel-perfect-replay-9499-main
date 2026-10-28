import { AlertManager } from "./alerts";
import { normalizeAngle } from "./attitude";
import type { ConnectionState, ConnectionStatus } from "./connection";
import { hasValidGpsFix } from "./gps";
import { recordsToCsv, recordsToJson, type TelemetryRecord } from "./history";
import { deriveMissionState } from "./missionState";
import {
  emptyTelemetry,
  type HistoryPoint,
  type Telemetry,
  type TelemetryDiagnostics,
  type TelemetryEvent,
  type TelemetryField,
  type TelemetrySnapshot,
} from "./model";
import { PacketTracker } from "./packetTracker";
import { evaluateSensors, sensorSignature, type SensorState } from "./sensorManager";
import type { TelemetrySample, TelemetrySink, TelemetrySource } from "./sources/types";

export interface TelemetryStoreOptions {
  /** Points kept in the full history buffer. Default 1800 (30 minutes at 1 Hz). */
  historyCapacity?: number;
  /** Points exposed through `snapshot.history`. Default 60. */
  historyView?: number;
  /** Clock, injectable for tests. */
  now?: () => number;
}

type SnapshotBase = Omit<TelemetrySnapshot, "diagnostics" | "sensors" | "mission" | "alerts">;

const MAX_EVENTS = 100;
const MAX_ERRORS = 100;
const RATE_WINDOW = 10;
const TICK_MS = 1000;

/**
 * Single source of truth for telemetry.
 *
 * Sources push samples into the store (through a `TelemetrySink`); components read
 * immutable snapshots with `useSyncExternalStore`. The store merges partial packets,
 * derives normalised attitude and GPS fix state, tracks packet-counter health and keeps
 * the history buffer. It never invents values: a field is "available" only after a
 * source has provided it.
 */
export class TelemetryStore {
  private snapshot: TelemetrySnapshot;
  private readonly listeners = new Set<() => void>();
  private readonly tracker = new PacketTracker();
  private buffer: HistoryPoint[] = [];
  private arrivals: number[] = [];
  private invalid = 0;
  private events: TelemetryEvent[] = [];
  private validationErrors: string[] = [];
  private source: TelemetrySource | null = null;
  private key: string | null = null;
  private running = false;
  private records: TelemetryRecord[] = [];
  private readonly alertManager = new AlertManager();
  private sensorCache: readonly SensorState[] = [];
  private sensorCacheKey = "";
  private missionStart: number | null = null;
  private accepted = 0;
  private ticker: ReturnType<typeof setInterval> | null = null;

  private readonly historyCapacity: number;
  private readonly historyView: number;
  private readonly now: () => number;

  constructor(options: TelemetryStoreOptions = {}) {
    this.historyCapacity = options.historyCapacity ?? 1800;
    this.historyView = options.historyView ?? 60;
    this.now = options.now ?? Date.now;
    this.snapshot = this.buildSnapshot({
      data: emptyTelemetry,
      available: new Set(),
      updatedAt: {},
      history: [],
      connection: { state: "idle", detail: null, since: this.now() },
      lastUpdated: null,
      source: { kind: "none", label: "No source" },
    });
  }

  // ── React integration (useSyncExternalStore) ────────────────────────────────

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): TelemetrySnapshot => this.snapshot;

  /** Server snapshot: identical to the client's first render, which avoids hydration mismatch. */
  readonly getServerSnapshot = (): TelemetrySnapshot => this.snapshot;

  /** Identity of the active source configuration. */
  get sourceKey(): string | null {
    return this.key;
  }

  /** The full history buffer (not reactive; read it when a chart renders). */
  getHistory(): readonly HistoryPoint[] {
    return this.buffer;
  }

  /** Every accepted packet still in the buffer (full telemetry), for export and replay. */
  getRecords(): readonly TelemetryRecord[] {
    return this.records;
  }

  exportCsv(): string {
    return recordsToCsv(this.records);
  }

  exportJson(): string {
    return recordsToJson(this.records);
  }

  // ── Source control ──────────────────────────────────────────────────────────

  /**
   * Selects a source and resets the snapshot to that source's initial state.
   * Pure with respect to the outside world: nothing starts until `start()`.
   */
  setSource(source: TelemetrySource, key: string): void {
    this.stop();
    this.source = source;
    this.key = key;
    this.tracker.reset();
    this.buffer = [];
    this.arrivals = [];
    this.invalid = 0;
    this.events = [];
    this.validationErrors = [];
    this.records = [];
    this.alertManager.reset();
    this.sensorCache = [];
    this.sensorCacheKey = "";
    this.missionStart = null;
    this.accepted = 0;

    const initial = source.getInitialSample();
    const fields = initial?.fields ?? {};
    const at = this.now();
    this.snapshot = this.buildSnapshot({
      data: { ...emptyTelemetry, ...fields },
      available: new Set(Object.keys(fields) as TelemetryField[]),
      updatedAt: {},
      history: [],
      connection: { state: "idle", detail: null, since: at },
      lastUpdated: null,
      source: source.info,
    });
    this.emit();
  }

  start(): void {
    if (this.running || !this.source) return;
    this.running = true;
    this.source.start(this.createSink(this.source));
    this.ticker = setInterval(() => this.tick(), TICK_MS);
  }

  stop(): void {
    if (!this.running || !this.source) return;
    this.running = false;
    if (this.ticker !== null) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
    this.source.stop();
    this.setConnectionState("idle");
  }

  // ── Sink handed to the active source ────────────────────────────────────────

  private createSink(owner: TelemetrySource): TelemetrySink {
    // Guard against a replaced source that publishes after being stopped.
    const active = () => this.source === owner && this.running;
    return {
      publish: (sample) => {
        if (active()) this.handleSample(sample);
      },
      setConnection: (state, detail) => {
        if (active()) this.setConnectionState(state, detail);
      },
      reportInvalid: (reason) => {
        if (active()) this.handleInvalid(reason);
      },
    };
  }

  private setConnectionState(state: ConnectionState, detail?: string): void {
    const prev = this.snapshot.connection;
    if (prev.state === state && prev.detail === (detail ?? null)) return;
    const at = this.now();
    const connection: ConnectionStatus = { state, detail: detail ?? null, since: prev.state === state ? prev.since : at };

    const type = eventTypeFor(state);
    if (type && prev.state !== state) this.pushEvent({ at, type, detail: detail ?? "" });

    this.snapshot = this.buildSnapshot({ ...this.snapshot, connection });
    this.emit();
  }

  private handleInvalid(reason: string): void {
    this.invalid += 1;
    this.validationErrors = [`[${new Date(this.now()).toISOString()}] ${reason}`, ...this.validationErrors].slice(0, MAX_ERRORS);
    this.alertManager.raise(
      { kind: "invalid-packet", key: "invalid-packet", level: "warning", message: `${this.invalid} invalid packet${this.invalid === 1 ? "" : "s"} rejected: ${reason}` },
      this.now(),
    );
    this.snapshot = this.buildSnapshot({ ...this.snapshot });
    this.emit();
  }

  /** Re-evaluates time-dependent state (sensor timeouts, mission duration) between packets. */
  private tick(): void {
    const next = this.buildSnapshot({ ...this.snapshot });
    const prev = this.snapshot;
    const changed =
      next.sensors !== prev.sensors ||
      next.alerts !== prev.alerts ||
      next.mission.status !== prev.mission.status;
    if (!changed) return;
    this.snapshot = next;
    this.emit();
  }

  private handleSample(sample: TelemetrySample): void {
    const now = this.now();
    const fields = this.derive(sample.fields);

    const data: Telemetry = { ...this.snapshot.data, ...fields };
    const available = new Set(this.snapshot.available);
    const updatedAt: Partial<Record<TelemetryField, number>> = { ...this.snapshot.updatedAt };
    for (const key of Object.keys(fields) as TelemetryField[]) {
      if (fields[key] === undefined) continue;
      available.add(key);
      updatedAt[key] = sample.receivedAt;
    }

    // GPS invariant: (0, 0) is never a position, whatever the source claims.
    if (data.latitude === 0 && data.longitude === 0) data.gpsFix = false;

    this.trackPacket(sample.packetNo, sample.receivedAt);
    this.arrivals = [...this.arrivals, now].slice(-RATE_WINDOW);

    this.accepted += 1;
    if (this.missionStart === null) this.missionStart = sample.receivedAt;
    this.alertManager.resolve("invalid-packet", now);
    this.records.push({ receivedAt: sample.receivedAt, packetNo: sample.packetNo, data });
    if (this.records.length > this.historyCapacity) this.records.splice(0, this.records.length - this.historyCapacity);

    this.buffer.push(toHistoryPoint(data, sample.receivedAt));
    if (this.buffer.length > this.historyCapacity) this.buffer.splice(0, this.buffer.length - this.historyCapacity);

    this.snapshot = this.buildSnapshot({
      ...this.snapshot,
      data,
      available,
      updatedAt,
      history: this.buffer.slice(-this.historyView),
      lastUpdated: sample.receivedAt,
    });
    this.emit();
  }

  /**
   * Derives visualisation values from raw ones: normalised roll/pitch from raw angles,
   * and a coordinate-based GPS fix when the source gave coordinates without a fix flag.
   */
  private derive(fields: Partial<Telemetry>): Partial<Telemetry> {
    const out: Partial<Telemetry> = { ...fields };
    if (out.rollRaw !== undefined && out.roll === undefined && Number.isFinite(out.rollRaw)) {
      out.roll = normalizeAngle(out.rollRaw);
    }
    if (out.pitchRaw !== undefined && out.pitch === undefined && Number.isFinite(out.pitchRaw)) {
      out.pitch = normalizeAngle(out.pitchRaw);
    }
    if (out.gpsFix === undefined && out.latitude !== undefined && out.longitude !== undefined) {
      out.gpsFix = hasValidGpsFix(out.latitude, out.longitude);
    }
    return out;
  }

  private trackPacket(packetNo: number | null, at: number): void {
    if (packetNo === null || !Number.isInteger(packetNo) || packetNo < 0) return;
    const event = this.tracker.observe(packetNo);
    if (event.kind === "restart") {
      this.pushEvent({ at, type: "receiver-restart", detail: `Packet counter reset (was ${event.previous}, now ${packetNo})` });
    } else if (event.kind === "gap") {
      this.pushEvent({ at, type: "packet-gap", detail: `${event.missed} packet${event.missed === 1 ? "" : "s"} missed before #${packetNo}` });
    }
  }

  private pushEvent(event: TelemetryEvent): void {
    this.events = [event, ...this.events].slice(0, MAX_EVENTS);
  }

  private computeRate(): number {
    const a = this.arrivals;
    if (a.length < 2) return 0;
    const first = a[0] as number;
    const last = a[a.length - 1] as number;
    const span = (last - first) / 1000;
    return span > 0 ? (a.length - 1) / span : 0;
  }

  private buildSnapshot(base: SnapshotBase): TelemetrySnapshot {
    const now = this.now();
    const diagnostics: TelemetryDiagnostics = {
      ...this.tracker.stats,
      invalid: this.invalid,
      packetsPerSecond: this.computeRate(),
      lastPacketAt: base.lastUpdated,
      events: this.events,
      validationErrors: this.validationErrors,
    };

    // Sensor health. Keep the previous array when nothing changed so subscribers stay quiet.
    const evaluated = evaluateSensors(base.available, base.updatedAt, base.data.gpsFix, now);
    const signature = sensorSignature(evaluated);
    if (signature !== this.sensorCacheKey) {
      this.sensorCache = evaluated;
      this.sensorCacheKey = signature;
    }

    this.syncAlerts(this.sensorCache, base.connection, now);
    const mission = deriveMissionState({
      startTime: this.missionStart,
      packetCount: this.accepted,
      lastPacketTime: base.lastUpdated,
      connection: base.connection,
      now,
    });
    return { ...base, diagnostics, sensors: this.sensorCache, mission, alerts: this.alertManager.list };
  }

  /** Raises or resolves alerts from the current sensor and connection state. */
  private syncAlerts(sensors: readonly SensorState[], connection: ConnectionStatus, now: number): void {
    const alerts = this.alertManager;
    for (const sensor of sensors) {
      const key = `sensor:${sensor.id}`;
      if (sensor.health === "offline") {
        alerts.raise({ kind: "sensor-disconnected", key, level: "warning", message: `${sensor.label} stopped reporting` }, now);
      } else {
        alerts.resolve(key, now);
      }
      if (sensor.id === "gps") {
        if (sensor.health === "degraded") alerts.raise({ kind: "gps-lost", key: "gps-lost", level: "warning", message: "GPS has no position fix" }, now);
        else alerts.resolve("gps-lost", now);
      }
    }

    if (connection.state === "disconnected" || connection.state === "error") {
      alerts.raise({ kind: "connection-lost", key: "connection-lost", level: "critical", message: connection.detail ? `Telemetry link lost (${connection.detail})` : "Telemetry link lost" }, now);
    } else if (connection.state === "connected") {
      alerts.resolve("connection-lost", now);
    }

    if (connection.state === "stale") {
      alerts.raise({ kind: "packet-timeout", key: "packet-timeout", level: "warning", message: connection.detail ?? "No packets received recently" }, now);
    } else if (connection.state === "connected") {
      alerts.resolve("packet-timeout", now);
    }
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

function eventTypeFor(state: ConnectionState): TelemetryEvent["type"] | null {
  switch (state) {
    case "connected": return "connected";
    case "stale": return "stale";
    case "disconnected": return "disconnected";
    case "error": return "error";
    case "reconnecting": return "reconnecting";
    case "connecting": return null;
    case "idle": return null;
  }
}

function toHistoryPoint(d: Telemetry, ts: number): HistoryPoint {
  const r = (n: number) => +n.toFixed(2);
  return {
    t: d.missionTime, ts,
    temperature: r(d.temperature), pressure: r(d.pressure), humidity: r(d.humidity),
    ax: +d.accelerationX.toFixed(3), ay: +d.accelerationY.toFixed(3), az: +d.accelerationZ.toFixed(3),
    gx: r(d.gyroX), gy: r(d.gyroY), gz: r(d.gyroZ),
    roll: r(d.roll), pitch: r(d.pitch), rollRaw: r(d.rollRaw), pitchRaw: r(d.pitchRaw),
  };
}
