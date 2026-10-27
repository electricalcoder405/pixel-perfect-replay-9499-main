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
  readonly info = { kind: "websocket", label: "Live · WebSocket" } as const;

  private sink: TelemetrySink | null = null;
  private socket: WebSocketLike | null = null;
  private running = false;
  private attempts = 0;
  private state: ConnectionState = "idle";
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private staleTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly staleTimeoutMs: number;
  private readonly backoffBaseMs: number;
  private readonly backoffMultiplier: number;
  private readonly backoffMaxMs: number;

  constructor(private readonly options: WebSocketSourceOptions) {
    this.staleTimeoutMs = options.staleTimeoutMs ?? 10_000;
    this.backoffBaseMs = options.backoffBaseMs ?? 1_000;
    this.backoffMultiplier = options.backoffMultiplier ?? 1.5;
    this.backoffMaxMs = options.backoffMaxMs ?? 30_000;
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
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      if (socket.readyState === CONNECTING) {
        // Closing a connecting socket throws a console error, so close once it opens.
        socket.onopen = () => socket.close();
      } else {
        socket.onopen = null;
        socket.close();
      }
    }
    this.sink = null;
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
      socket = this.options.createSocket ? this.options.createSocket(this.options.url) : (new WebSocket(this.options.url) as unknown as WebSocketLike);
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
    };

    socket.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    // An error is always followed by a close event, which handles recovery.
    socket.onerror = () => {};

    socket.onclose = (event) => {
      this.clearStaleTimer();
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
    this.armStaleTimer();

    const result = this.options.parse(data);
    if (!result.ok) {
      this.sink?.reportInvalid(result.reason);
      return;
    }
    this.sink?.publish({
      fields: result.fields,
      packetNo: result.packetNo,
      receivedAt: result.timestamp ?? Date.now(),
    });
  }

  private armStaleTimer(): void {
    this.clearStaleTimer();
    this.staleTimer = setTimeout(() => {
      if (this.state === "connected") this.setState("stale", `No packets for ${Math.round(this.staleTimeoutMs / 1000)} seconds`);
    }, this.staleTimeoutMs);
  }

  private scheduleReconnect(): void {
    if (!this.running) return;
    this.clearReconnectTimer();
    const delay = Math.min(this.backoffBaseMs * Math.pow(this.backoffMultiplier, this.attempts), this.backoffMaxMs);
    this.attempts += 1;
    this.setState("connecting", `Reconnecting in ${Math.round(delay / 100) / 10} s (attempt ${this.attempts})`);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private clearStaleTimer(): void {
    if (this.staleTimer !== null) {
      clearTimeout(this.staleTimer);
      this.staleTimer = null;
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
    this.clearReconnectTimer();
  }
}
