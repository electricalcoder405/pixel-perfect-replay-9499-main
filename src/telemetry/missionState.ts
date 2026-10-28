import type { ConnectionStatus } from "./connection";

/** standby: no packet yet. active: data flowing. degraded: connected but stale. link-lost: link down after the mission began. */
export type MissionStatus = "standby" | "active" | "degraded" | "link-lost";

export interface MissionState {
  readonly status: MissionStatus;
  /** Wall-clock ms of the first accepted packet, or null. */
  readonly startTime: number | null;
  /** Elapsed ms from start to now (frozen at the last packet while the link is lost). */
  readonly durationMs: number;
  /** Accepted packets since the source started. */
  readonly packetCount: number;
  readonly lastPacketTime: number | null;
}

export interface MissionInputs {
  readonly startTime: number | null;
  readonly packetCount: number;
  readonly lastPacketTime: number | null;
  readonly connection: ConnectionStatus;
  readonly now: number;
}

export function deriveMissionState({ startTime, packetCount, lastPacketTime, connection, now }: MissionInputs): MissionState {
  if (startTime === null) return { status: "standby", startTime: null, durationMs: 0, packetCount, lastPacketTime };

  let status: MissionStatus;
  switch (connection.state) {
    case "connected": status = "active"; break;
    case "stale": status = "degraded"; break;
    default: status = "link-lost";
  }
  const end = status === "link-lost" ? (lastPacketTime ?? startTime) : now;
  return { status, startTime, durationMs: Math.max(0, end - startTime), packetCount, lastPacketTime };
}
