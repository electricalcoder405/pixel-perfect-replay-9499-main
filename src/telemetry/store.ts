import { normalizeAngle } from "./attitude";
import type { ConnectionState, ConnectionStatus } from "./connection";
import { hasValidGpsFix } from "./gps";
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
import type { TelemetrySample, TelemetrySink, TelemetrySource } from "./sources/types";

export interface TelemetryStoreOptions {
  /** Points kept in the full history buffer. Default 1800 (30 minutes at 1 Hz). */
  historyCapacity?: number;
  /** Points exposed through `snapshot.history`. Default 60. */
  historyView?: number;
  /** Clock, injectable for tests. */
  now?: () => number;
}

const MAX_EVENTS = 100;
const MAX_ERRORS = 100;
const RATE_WINDOW = 10;

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
  }

  stop(): void {
    if (!this.running || !this.source) return;
    this.running = false;
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

    const type = eventTypeFor(state, detail);
    if (type && prev.state !== state) this.pushEvent({ at, type, detail: detail ?? "" });

    this.snapshot = this.buildSnapshot({ ...this.snapshot, connection });
    this.emit();
  }

  private handleInvalid(reason: string): void {
    this.invalid += 1;
    this.validationErrors = [`[${new Date(this.now()).toISOString()}] ${reason}`, ...this.validationErrors].slice(0, MAX_ERRORS);
    this.snapshot = this.buildSnapshot({ ...this.snapshot });
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

  private buildSnapshot(base: Omit<TelemetrySnapshot, "diagnostics">): TelemetrySnapshot {
    const diagnostics: TelemetryDiagnostics = {
      ...this.tracker.stats,
      invalid: this.invalid,
      packetsPerSecond: this.computeRate(),
      lastPacketAt: base.lastUpdated,
      events: this.events,
      validationErrors: this.validationErrors,
    };
    return { ...base, diagnostics };
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

function eventTypeFor(state: ConnectionState, detail: string | undefined): TelemetryEvent["type"] | null {
  switch (state) {
    case "connected": return "connected";
    case "stale": return "stale";
    case "disconnected": return "disconnected";
    case "error": return "error";
    case "connecting": return detail ? "reconnecting" : null;
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
