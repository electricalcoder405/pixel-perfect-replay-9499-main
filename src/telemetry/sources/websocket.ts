import type { ConnectionState } from "../connection";
import type { PacketParser, TelemetrySink, TelemetrySource } from "./types";

/** The subset of the browser WebSocket API this source relies on. */
export interface WebSocketLike {
  readyState: number;
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: ((event: { code: number; reason: string }) => void) | null;
  close(): void;
  send?(data: string): void;
}

export interface WebSocketSourceOptions {
  /** e.g. ws://localhost:8081 */
  url: string;
  /** Converts one message into telemetry fields. Supplied by the integration layer. */
  parse: PacketParser;
  /** Mark the link stale after this long without a packet. Default 10 000 ms. */
  staleTimeoutMs?: number;
  /** First reconnect delay. Default 1 000 ms. */
  backoffBaseMs?: number;
  /** Delay multiplier per failed attempt. Default 1.5. */
  backoffMultiplier?: number;
  /** Longest reconnect delay. Default 30 000 ms. */
  backoffMaxMs?: number;
  /** Send a keep-alive this often while connected. Default 0 (disabled): the bridge protocol decides. */
  heartbeatIntervalMs?: number;
  /** Keep-alive message text. Default {"type":"ping"}. */
  heartbeatMessage?: string;
  /** Force a reconnect after this long in the stale state. Default 3 x staleTimeoutMs. */
  recoverAfterMs?: number;
  /** Socket factory, injectable for tests. Defaults to `new WebSocket(url)`. */
  createSocket?: (url: string) => WebSocketLike;
}

const CONNECTING = 0;

/**
 * Live telemetry over WebSocket.
 *
 * Owns only the connection lifecycle: connect, bounded exponential reconnect, stale
 * detection and recovery. Interpreting packets is the injected `parse` function's job,
 * so this class stays correct whatever the bridge protocol turns out to be.
 */
export class WebSocketSource implements TelemetrySource {
  readonly info = { kind: "websocket", label: "Ground Controller · Live" } as const;

  private sink: TelemetrySink | null = null;
  private socket: WebSocketLike | null = null;
  private running = false;
  private attempts = 0;
  private state: ConnectionState = "idle";
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private staleTimer: ReturnType<typeof setTimeout> | null = null;
  private recoverTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  private readonly staleTimeoutMs: number;
  private readonly backoffBaseMs: number;
  private readonly backoffMultiplier: number;
  private readonly backoffMaxMs: number;
  private readonly recoverAfterMs: number;

  constructor(private readonly options: WebSocketSourceOptions) {
    this.staleTimeoutMs = options.staleTimeoutMs ?? 10_000;
    this.backoffBaseMs = options.backoffBaseMs ?? 1_000;
    this.backoffMultiplier = options.backoffMultiplier ?? 1.5;
    this.backoffMaxMs = options.backoffMaxMs ?? 30_000;
    this.recoverAfterMs = options.recoverAfterMs ?? this.staleTimeoutMs * 3;
  }

  /** No real data exists until the first packet arrives. */
  getInitialSample() {
    return null;
  }

  start(sink: TelemetrySink): void {
    if (this.running) return;
    this.running = true;
    this.sink = sink;
    this.attempts = 0;
    this.connect();
  }

  stop(): void {
    this.running = false;
    this.clearTimers();
    this.closeSocket();
    this.sink = null;
  }

  /** Detaches handlers and closes the current socket, if any. */
  private closeSocket(): void {
    const socket = this.socket;
    this.socket = null;
    if (!socket) return;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    if (socket.readyState === CONNECTING) {
      // Closing a connecting socket throws a console error, so close once it opens.
      socket.onopen = () => socket.close();
    } else {
      socket.onopen = null;
      try {
        socket.close();
      } catch {
        // Already closed.
      }
    }
  }

  private setState(state: ConnectionState, detail?: string): void {
    this.state = state;
    this.sink?.setConnection(state, detail);
  }

  private connect(): void {
    if (!this.running) return;
    this.setState("connecting");

    let socket: WebSocketLike;
    try {
      socket = this.options.createSocket
        ? this.options.createSocket(this.options.url)
        : (new WebSocket(this.options.url) as unknown as WebSocketLike);
    } catch (error) {
      this.setState("error", error instanceof Error ? error.message : String(error));
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;

    socket.onopen = () => {
      this.attempts = 0;
      this.setState("connected");
      this.armStaleTimer();
      this.startHeartbeat(socket);
    };

    socket.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    // An error is always followed by a close event, which handles recovery.
    socket.onerror = () => {};

    socket.onclose = (event) => {
      this.clearStaleTimer();
      this.stopHeartbeat();
      this.setState("disconnected", `Code ${event.code}${event.reason ? `: ${event.reason}` : ""}`);
      this.scheduleReconnect();
    };
  }

  private handleMessage(data: unknown): void {
    if (typeof data !== "string") {
      this.sink?.reportInvalid("Unsupported message type (expected text)");
      return;
    }
    // Any message proves the link is alive, so recover from a stale state.
    if (this.state === "stale") this.setState("connected");
    this.clearRecoverTimer();
    this.armStaleTimer();

    const result = this.options.parse(data);
    if (!result.ok) {
      this.sink?.reportInvalid(result.reason);
      return;
    }
    if (result.heartbeat) return;
    this.sink?.publish({
      fields: result.fields,
      packetNo: result.packetNo,
      receivedAt: result.timestamp ?? Date.now(),
    });
  }

  private armStaleTimer(): void {
    this.clearStaleTimer();
    this.staleTimer = setTimeout(() => {
      if (this.state !== "connected") return;
      this.setState("stale", `No packets for ${Math.round(this.staleTimeoutMs / 1000)} seconds`);
      this.armRecoverTimer();
    }, this.staleTimeoutMs);
  }

  /** A link that stays silent after going stale is probably dead: drop it and reconnect. */
  private armRecoverTimer(): void {
    this.clearRecoverTimer();
    this.recoverTimer = setTimeout(() => {
      if (!this.running || this.state !== "stale") return;
      this.stopHeartbeat();
      this.closeSocket();
      this.setState("disconnected", "No data received; recovering the link");
      this.scheduleReconnect();
    }, this.recoverAfterMs);
  }

  private startHeartbeat(socket: WebSocketLike): void {
    this.stopHeartbeat();
    const interval = this.options.heartbeatIntervalMs ?? 0;
    if (interval <= 0 || !socket.send) return;
    const message = this.options.heartbeatMessage ?? '{"type":"ping"}';
    this.heartbeatTimer = setInterval(() => {
      try {
        if (this.socket === socket) socket.send?.(message);
      } catch {
        // A failed send surfaces as a close event, which triggers reconnection.
      }
    }, interval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (!this.running) return;
    this.clearReconnectTimer();
    const delay = Math.min(
      this.backoffBaseMs * Math.pow(this.backoffMultiplier, this.attempts),
      this.backoffMaxMs,
    );
    this.attempts += 1;
    this.setState(
      "reconnecting",
      `Reconnecting in ${Math.round(delay / 100) / 10} s (attempt ${this.attempts})`,
    );
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private clearStaleTimer(): void {
    if (this.staleTimer !== null) {
      clearTimeout(this.staleTimer);
      this.staleTimer = null;
    }
  }

  private clearRecoverTimer(): void {
    if (this.recoverTimer !== null) {
      clearTimeout(this.recoverTimer);
      this.recoverTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearStaleTimer();
    this.clearRecoverTimer();
    this.stopHeartbeat();
    this.clearReconnectTimer();
  }
}
