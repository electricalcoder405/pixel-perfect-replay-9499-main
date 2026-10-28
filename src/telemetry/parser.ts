import type { Telemetry, TelemetryField } from "./model";
import type { PacketParseResult } from "./sources/types";

/**
 * Bridge packet parser.
 *
 * Accepts one JSON text message from the telemetry bridge, validates every value,
 * drops anything invalid and normalises field names. A packet with no usable value is
 * rejected (the store counts it as invalid); a packet with some usable values is accepted
 * and only those values are used. Missing values are never invented.
 */

const MAX_MESSAGE_LENGTH = 64 * 1024;
const HEARTBEAT_TYPES = new Set(["heartbeat", "ping", "pong", "keepalive"]);

interface NumberSpec {
  readonly field: TelemetryField;
  readonly aliases: readonly string[];
  readonly min: number;
  readonly max: number;
}

const NUMBER_SPECS: readonly NumberSpec[] = [
  { field: "temperature", aliases: ["temperature", "temp", "dhttemp", "dhttemperature"], min: -80, max: 125 },
  { field: "humidity", aliases: ["humidity", "hum", "rh", "dhthumidity"], min: 0, max: 100 },
  { field: "pressure", aliases: ["pressure", "pres", "press", "bmppressure", "hpa"], min: 300, max: 1100 },
  { field: "altitude", aliases: ["altitude", "alt", "bmpaltitude", "estimatedaltitude"], min: -1000, max: 100_000 },
  { field: "latitude", aliases: ["latitude", "lat", "gpslat"], min: -90, max: 90 },
  { field: "longitude", aliases: ["longitude", "lon", "lng", "long", "gpslon", "gpslng"], min: -180, max: 180 },
  { field: "accelerationX", aliases: ["accelerationx", "accelx", "accx", "ax"], min: -500, max: 500 },
  { field: "accelerationY", aliases: ["accelerationy", "accely", "accy", "ay"], min: -500, max: 500 },
  { field: "accelerationZ", aliases: ["accelerationz", "accelz", "accz", "az"], min: -500, max: 500 },
  { field: "gyroX", aliases: ["gyrox", "gx"], min: -20_000, max: 20_000 },
  { field: "gyroY", aliases: ["gyroy", "gy"], min: -20_000, max: 20_000 },
  { field: "gyroZ", aliases: ["gyroz", "gz"], min: -20_000, max: 20_000 },
  // Raw angles are unbounded on the real hardware; the store derives the normalised values.
  { field: "rollRaw", aliases: ["roll", "rollraw"], min: -1_000_000, max: 1_000_000 },
  { field: "pitchRaw", aliases: ["pitch", "pitchraw"], min: -1_000_000, max: 1_000_000 },
  { field: "yaw", aliases: ["yaw", "heading"], min: -1_000_000, max: 1_000_000 },
  { field: "battery", aliases: ["battery", "batt", "batterypercent"], min: 0, max: 100 },
  { field: "signalStrength", aliases: ["signalstrength", "rssi", "signal"], min: -150, max: 0 },
  { field: "missionTime", aliases: ["missiontime", "uptime"], min: 0, max: 1e10 },
];

const BOOLEAN_SPECS: readonly { field: "gpsFix" | "charging"; aliases: readonly string[] }[] = [
  { field: "gpsFix", aliases: ["gpsfix", "fix", "hasfix"] },
  { field: "charging", aliases: ["charging", "ischarging"] },
];

const PACKET_NO_ALIASES = ["packetno", "packetnumber", "packet", "packetcount", "seq", "sequence", "counter", "id"];
const TIMESTAMP_ALIASES = ["timestamp", "ts", "time", "receivedat"];

/** Lower-cases a key and strips separators, so `accel_x`, `AccelX` and `accel-x` match. */
const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return null;
}

/** Epoch milliseconds, accepting epoch seconds too. Anything else (e.g. uptime) is ignored. */
function toEpochMs(value: unknown): number | null {
  const n = toNumber(value);
  if (n === null) return null;
  if (n >= 1e12) return n;
  if (n >= 1e9) return n * 1000;
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrap(payload: Record<string, unknown>): Record<string, unknown> {
  for (const key of ["data", "telemetry", "payload"]) {
    const inner = payload[key];
    if (isRecord(inner)) return inner;
  }
  return payload;
}

export function parseBridgePacket(message: string): PacketParseResult {
  if (message.length > MAX_MESSAGE_LENGTH) return { ok: false, reason: "Packet too large" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(message);
  } catch {
    return { ok: false, reason: "Packet is not valid JSON" };
  }
  if (!isRecord(parsed)) return { ok: false, reason: "Packet is not a JSON object" };

  const kind = parsed["type"] ?? parsed["event"];
  if (typeof kind === "string" && HEARTBEAT_TYPES.has(kind.toLowerCase())) {
    return { ok: true, fields: {}, packetNo: null, timestamp: null, heartbeat: true };
  }

  const source = unwrap(parsed);
  const lookup = new Map<string, unknown>();
  for (const [key, value] of Object.entries(source)) lookup.set(normalizeKey(key), value);
  const find = (aliases: readonly string[]): unknown => {
    for (const alias of aliases) if (lookup.has(alias)) return lookup.get(alias);
    return undefined;
  };

  const fields: Partial<Telemetry> = {};
  const rejected: string[] = [];
  let usable = 0;

  for (const spec of NUMBER_SPECS) {
    const raw = find(spec.aliases);
    if (raw === undefined || raw === null) continue;
    const n = toNumber(raw);
    if (n === null || n < spec.min || n > spec.max) {
      rejected.push(spec.field);
      continue;
    }
    fields[spec.field as Exclude<TelemetryField, "gpsFix" | "charging" | "connected">] = n;
    usable += 1;
  }

  for (const spec of BOOLEAN_SPECS) {
    const raw = find(spec.aliases);
    if (raw === undefined || raw === null) continue;
    const b = toBoolean(raw);
    if (b === null) {
      rejected.push(spec.field);
      continue;
    }
    fields[spec.field] = b;
    usable += 1;
  }

  if (usable === 0) {
    return { ok: false, reason: rejected.length > 0 ? `No valid values (rejected: ${rejected.join(", ")})` : "Packet contains no telemetry values" };
  }

  const packetRaw = toNumber(find(PACKET_NO_ALIASES));
  const packetNo = packetRaw !== null && Number.isInteger(packetRaw) && packetRaw >= 0 ? packetRaw : null;
  if (packetNo !== null) fields.packetCount = packetNo;
  fields.connected = true;

  return { ok: true, fields, packetNo, timestamp: toEpochMs(find(TIMESTAMP_ALIASES) ?? parsed["timestamp"]) };
}
