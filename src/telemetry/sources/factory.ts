import { SimulatorSource, type SimulatorOptions } from "./simulator";
import type { PacketParser, TelemetrySource } from "./types";
import { WebSocketSource } from "./websocket";

/**
 * Telemetry source selection. This is the only place that decides where data comes from.
 * Switching between the simulator and live hardware means changing this object.
 */
export type TelemetrySourceConfig =
  | ({ kind: "simulator" } & SimulatorOptions)
  | { kind: "websocket"; url: string; parse: PacketParser; staleTimeoutMs?: number; heartbeatIntervalMs?: number };

export interface TelemetryConfig {
  source: TelemetrySourceConfig;
}

export function createTelemetrySource(config: TelemetrySourceConfig): TelemetrySource {
  switch (config.kind) {
    case "simulator": {
      const { kind: _kind, ...options } = config;
      return new SimulatorSource(options);
    }
    case "websocket":
      return new WebSocketSource({
        url: config.url,
        parse: config.parse,
        ...(config.staleTimeoutMs !== undefined ? { staleTimeoutMs: config.staleTimeoutMs } : {}),
        ...(config.heartbeatIntervalMs !== undefined ? { heartbeatIntervalMs: config.heartbeatIntervalMs } : {}),
      });
  }
}

/** Stable identity of a source configuration; the provider restarts the source when it changes. */
export function sourceKey(config: TelemetrySourceConfig): string {
  return config.kind === "websocket" ? `websocket:${config.url}` : "simulator";
}
