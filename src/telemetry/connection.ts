/** Connection lifecycle shared by every telemetry source. */
export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "receiving"
  | "waiting"
  | "stale"
  | "error"
  | "reconnecting"
  | "idle";

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
  idle: {
    label: "Idle",
    description: "Telemetry source is not running.",
    tone: "neutral",
    live: false,
  },
  waiting: {
    label: "Waiting",
    description: "Waiting for Ground Controller...",
    tone: "warn",
    live: false,
  },
  connecting: {
    label: "Connecting",
    description: "Establishing link to ground controller bridge...",
    tone: "info",
    live: false,
  },
  connected: {
    label: "Connected",
    description: "Bridge linked. Ready for telemetry packets.",
    tone: "ok",
    live: true,
  },
  receiving: {
    label: "Receiving",
    description: "Live aerospace telemetry streaming.",
    tone: "ok",
    live: true,
  },
  reconnecting: {
    label: "Reconnecting",
    description: "Ground link lost. Attempting reconnection...",
    tone: "warn",
    live: false,
  },
  stale: {
    label: "Stale Data",
    description: "Connected, but no packet has arrived recently.",
    tone: "warn",
    live: false,
  },
  disconnected: {
    label: "Disconnected",
    description: "Ground controller link disconnected.",
    tone: "crit",
    live: false,
  },
  error: {
    label: "Link Error",
    description: "The telemetry link reported an error.",
    tone: "crit",
    live: false,
  },
};
