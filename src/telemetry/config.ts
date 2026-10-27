import type { TelemetryConfig } from "./sources/factory";

/**
 * Where telemetry comes from. The simulator needs no hardware.
 *
 * Live hardware (Phase 7) will use:
 *   { kind: "websocket", url: "ws://localhost:8081", parse: parseBridgePacket }
 */
export const telemetryConfig: TelemetryConfig = {
  source: { kind: "simulator" },
};
