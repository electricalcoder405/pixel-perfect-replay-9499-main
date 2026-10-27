/** Connection lifecycle shared by every telemetry source. */
export type ConnectionState = "idle" | "connecting" | "connected" | "stale" | "disconnected" | "error";

export type ConnectionTone = "ok" | "info" | "warn" | "crit" | "neutral";

export interface ConnectionStatus {
  readonly state: ConnectionState;
  /** Optional human-readable detail, e.g. a close code or retry delay. */
  readonly detail: string | null;
  /** Wall-clock ms when the state last changed. */
  readonly since: number;
}

export interface ConnectionMeta {
  readonly label: string;
  readonly description: string;
  readonly tone: ConnectionTone;
  /** True when data is flowing or was received recently enough to trust. */
  readonly live: boolean;
}

export const CONNECTION_META: Readonly<Record<ConnectionState, ConnectionMeta>> = {
  idle: { label: "Idle", description: "Telemetry source is not running.", tone: "neutral", live: false },
  connecting: { label: "Connecting", description: "Establishing the telemetry link.", tone: "info", live: false },
  connected: { label: "Connected", description: "Telemetry is flowing.", tone: "ok", live: true },
  stale: { label: "Stale Data", description: "Connected, but no packet has arrived recently.", tone: "warn", live: false },
  disconnected: { label: "Disconnected", description: "Link lost. Reconnecting automatically.", tone: "crit", live: false },
  error: { label: "Link Error", description: "The telemetry link reported an error.", tone: "crit", live: false },
};
