import type { Alert } from "./alerts";
import type { ConnectionStatus } from "./connection";
import type { MissionState } from "./missionState";
import type { SensorState } from "./sensorManager";
import type { PacketStats } from "./packetTracker";
import { ACCEL } from "./units";

/**
 * Single telemetry object consumed by the UI.
 *
 * Fields the connected hardware does not provide keep a neutral value and are absent
 * from `TelemetrySnapshot.available`; the UI must show "No Data" for them.
 */
export interface Telemetry {
  temperature: number;
  humidity: number;
  pressure: number;
  altitude: number;
  latitude: number;
  longitude: number;
  /** In the unit configured in `units.ts` (currently g). */
  accelerationX: number;
  accelerationY: number;
  accelerationZ: number;
  gyroX: number;
  gyroY: number;
  gyroZ: number;
  /** Normalised to (-180°, +180°] for visualisation. */
  roll: number;
  /** Normalised to (-180°, +180°] for visualisation. */
  pitch: number;
  yaw: number;
  /** Raw receiver values, preserved for logs and history. */
  rollRaw: number;
  pitchRaw: number;
  packetCount: number;
  battery: number;
  charging: boolean;
  missionTime: number;
  signalStrength: number;
  gpsFix: boolean;
  connected: boolean;
}

export type TelemetryField = keyof Telemetry;

export const initialTelemetry: Telemetry = {
  temperature: 24.6, humidity: 48, pressure: 1008.4, altitude: 41,
  latitude: 28.6139, longitude: 77.209,
  accelerationX: 0.002 * ACCEL.gravity, accelerationY: -0.001 * ACCEL.gravity, accelerationZ: ACCEL.gravity,
  gyroX: 0, gyroY: 0, gyroZ: 0, roll: 0, pitch: 0, yaw: 0, rollRaw: 0, pitchRaw: 0,
  packetCount: 0, battery: 87, charging: true, missionTime: 0,
  signalStrength: -62, gpsFix: true, connected: true,
};

/** Neutral values used before any live packet arrives. Nothing here is real data. */
export const emptyTelemetry: Telemetry = {
  temperature: 0, humidity: 0, pressure: 0, altitude: 0,
  latitude: 0, longitude: 0,
  accelerationX: 0, accelerationY: 0, accelerationZ: 0,
  gyroX: 0, gyroY: 0, gyroZ: 0, roll: 0, pitch: 0, yaw: 0, rollRaw: 0, pitchRaw: 0,
  packetCount: 0, battery: 0, charging: false, missionTime: 0,
  signalStrength: 0, gpsFix: false, connected: false,
};

export const ALL_TELEMETRY_FIELDS = Object.keys(initialTelemetry) as TelemetryField[];

export interface HistoryPoint {
  /** Mission time in seconds (kept for existing charts). */
  t: number;
  /** Wall-clock time in ms. */
  ts: number;
  temperature: number;
  pressure: number;
  humidity: number;
  ax: number; ay: number; az: number;
  gx: number; gy: number; gz: number;
  /** Normalised attitude. */
  roll: number;
  pitch: number;
  /** Raw receiver attitude, never normalised. */
  rollRaw: number;
  pitchRaw: number;
}

export interface TelemetryEvent {
  at: number;
  type: "connected" | "disconnected" | "reconnecting" | "stale" | "error" | "receiver-restart" | "packet-gap";
  detail: string;
}

export interface TelemetryDiagnostics extends PacketStats {
  /** Messages that could not be parsed. */
  invalid: number;
  /** Packets per second, measured between recent arrivals. */
  packetsPerSecond: number;
  /** Wall-clock ms of the last accepted packet, or null. */
  lastPacketAt: number | null;
  /** Newest first. */
  events: readonly TelemetryEvent[];
  /** Newest first. */
  validationErrors: readonly string[];
}

export interface TelemetrySourceInfo {
  readonly kind: "simulator" | "websocket" | "none";
  readonly label: string;
}

export interface TelemetrySnapshot {
  readonly data: Telemetry;
  /** Fields that have received a real value from the active source. */
  readonly available: ReadonlySet<TelemetryField>;
  /** Wall-clock ms each field last received a value. */
  readonly updatedAt: Readonly<Partial<Record<TelemetryField, number>>>;
  /** Most recent history points (compatibility view used by the current charts). */
  readonly history: readonly HistoryPoint[];
  readonly connection: ConnectionStatus;
  readonly diagnostics: TelemetryDiagnostics;
  readonly source: TelemetrySourceInfo;
  /** Wall-clock ms of the last accepted packet, or null. */
  readonly lastUpdated: number | null;
  /** Per-sensor availability, last update, health and errors. */
  readonly sensors: readonly SensorState[];
  /** Mission start, duration, status, packet count and last packet time. */
  readonly mission: MissionState;
  /** Newest first, including resolved alerts. */
  readonly alerts: readonly Alert[];
}
