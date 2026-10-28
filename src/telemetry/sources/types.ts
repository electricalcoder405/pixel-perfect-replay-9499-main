import type { ConnectionState } from "../connection";
import type { Telemetry, TelemetryField, TelemetrySourceInfo } from "../model";

/** One accepted packet's worth of values. Only the fields present were received. */
export interface TelemetrySample {
  readonly fields: Partial<Telemetry>;
  /** Receiver packet counter, or null if the source has none. */
  readonly packetNo: number | null;
  /** Wall-clock ms the packet was produced or received. */
  readonly receivedAt: number;
}

/** What a source may do to the store. The store implements this. */
export interface TelemetrySink {
  publish(sample: TelemetrySample): void;
  setConnection(state: ConnectionState, detail?: string): void;
  reportInvalid(reason: string): void;
}

/**
 * A producer of telemetry. The simulator and the live WebSocket bridge both
 * implement this, so switching is a configuration change only.
 */
export interface TelemetrySource {
  readonly info: TelemetrySourceInfo;
  /**
   * Values to show before the first packet. Return null when there is nothing real
   * to show yet, so every field stays "No Data" until data arrives.
   */
  getInitialSample(): { fields: Partial<Telemetry> } | null;
  start(sink: TelemetrySink): void;
  stop(): void;
}

export type PacketParseResult =
  | {
      readonly ok: true;
      readonly fields: Partial<Telemetry>;
      readonly packetNo: number | null;
      /** Packet timestamp in ms when the packet carries one. */
      readonly timestamp: number | null;
      /** True for keep-alive messages: proves the link is alive but carries no telemetry. */
      readonly heartbeat?: boolean;
    }
  | { readonly ok: false; readonly reason: string };

/** Converts one raw WebSocket message into telemetry fields. */
export type PacketParser = (message: string) => PacketParseResult;

export type { TelemetryField };
