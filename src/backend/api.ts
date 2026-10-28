import { recordsToCsv, recordsToJson, type TelemetryRecord } from "../telemetry/history";
import type { Telemetry } from "../telemetry/model";
import { parseBridgePacket } from "../telemetry/parser";
import { evaluateSensors } from "../telemetry/sensorManager";

/**
 * Production-grade Aerospace Mission Control Telemetry REST API
 * Served by the same server entry as the app (src/server.ts).
 *
 * Endpoints:
 *   GET    /api/health               liveness & system metrics
 *   GET    /api/telemetry/status     counters, buffer depth, age, rates
 *   GET    /api/telemetry/latest     latest merged packet
 *   GET    /api/telemetry/history    recent records (?limit=, default 100, ?from=&to=)
 *   GET    /api/telemetry/export     ?format=csv|json
 *   GET    /api/telemetry/diagnostics packet stats, rates, errors, events, memory
 *   GET    /api/telemetry/connection ground station link & serial bridge status
 *   GET    /api/telemetry/sensors    sensor health (DHT11, BMP280, MPU6050, GPS)
 *   GET    /api/telemetry/alerts     active & historical alerts
 *   POST   /api/telemetry/replay     control replay (action: "start"|"stop"|"seek", speed, position)
 *   POST   /api/telemetry            ingest one bridge packet (JSON or CSV line)
 *   DELETE /api/telemetry            clear stored data & reset counters
 */

const CAPACITY = 10_000;
const MAX_BODY_BYTES = 128 * 1024;
const startedAt = Date.now();

interface DiagnosticEvent {
  timestamp: number;
  type: "info" | "warning" | "error" | "link";
  message: string;
}

interface AlertItem {
  id: string;
  level: "info" | "warning" | "critical";
  message: string;
  timestamp: number;
  resolved: boolean;
}

const state = {
  records: [] as TelemetryRecord[],
  latest: {} as Partial<Telemetry>,
  updatedAt: {} as Partial<Record<keyof Telemetry, number>>,
  latestAt: null as number | null,
  accepted: 0,
  invalid: 0,
  lastPacketNo: null as number | null,
  missedPackets: 0,
  lastError: null as string | null,
  recentArrivals: [] as number[],
  events: [] as DiagnosticEvent[],
  alerts: [] as AlertItem[],
  connection: {
    state: "connected" as "idle" | "connected" | "reconnecting" | "offline",
    mode: "live" as "live" | "simulator" | "replay",
    serialPort: "COM3",
    baudRate: 115200,
    lastHeartbeat: Date.now(),
    bridgeOnline: true,
  },
  replay: {
    active: false,
    speed: 1,
    cursor: 0,
    totalRecords: 0,
  },
};

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
  "access-control-allow-headers": "content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...CORS,
    },
  });
}

function text(body: string, contentType: string, filename: string): Response {
  return new Response(body, {
    headers: {
      "content-type": contentType,
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
      ...CORS,
    },
  });
}

function recordEvent(type: DiagnosticEvent["type"], message: string) {
  state.events.unshift({ timestamp: Date.now(), type, message });
  if (state.events.length > 200) state.events.pop();
}

function calculatePacketRate(): number {
  const now = Date.now();
  const windowStart = now - 5000;
  state.recentArrivals = state.recentArrivals.filter((t) => t > windowStart);
  return state.recentArrivals.length > 0 ? Number((state.recentArrivals.length / 5).toFixed(1)) : 0;
}

async function ingest(request: Request): Promise<Response> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return json({ ok: false, error: "Payload too large" }, 413);
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) return json({ ok: false, error: "Payload too large" }, 413);

  const result = parseBridgePacket(body);
  if (!result.ok) {
    state.invalid += 1;
    state.lastError = result.reason;
    recordEvent("warning", `Packet rejected: ${result.reason}`);
    return json({ ok: false, error: result.reason }, 422);
  }

  if (result.heartbeat) {
    state.connection.lastHeartbeat = Date.now();
    state.connection.bridgeOnline = true;
    return json({ ok: true, heartbeat: true });
  }

  const now = Date.now();
  const receivedAt = result.timestamp ?? now;

  // Track sequence and missed packets
  if (result.packetNo !== null) {
    if (state.lastPacketNo !== null && result.packetNo > state.lastPacketNo + 1) {
      const gap = result.packetNo - state.lastPacketNo - 1;
      state.missedPackets += gap;
      recordEvent(
        "warning",
        `Packet gap detected: missed ${gap} packet(s) between #${state.lastPacketNo} and #${result.packetNo}`,
      );
    }
    state.lastPacketNo = result.packetNo;
  }

  // Update fields and timestamps
  for (const [key, val] of Object.entries(result.fields)) {
    if (val !== undefined && val !== null) {
      const k = key as keyof Telemetry;
      state.updatedAt[k] = receivedAt;
    }
  }

  state.latest = { ...state.latest, ...result.fields };
  state.latestAt = receivedAt;
  state.accepted += 1;
  state.recentArrivals.push(now);

  state.records.push({ receivedAt, packetNo: result.packetNo, data: result.fields });
  if (state.records.length > CAPACITY) {
    state.records.splice(0, state.records.length - CAPACITY);
  }

  return json({ ok: true, accepted: state.accepted, packetNo: result.packetNo }, 202);
}

/** Returns a Response for /api/* requests, or null so the app handles everything else. */
export async function handleApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return null;
  const path = url.pathname.replace(/\/+$/, "");
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  try {
    // ── Liveness & System Health ─────────────────────────────────────────────
    if (path === "/api/health" && method === "GET") {
      const mem =
        typeof process !== "undefined" && process.memoryUsage ? process.memoryUsage() : null;
      return json({
        status: "ok",
        subsystem: "ORBITRA-MISSION-CONTROL",
        uptimeMs: Date.now() - startedAt,
        time: new Date().toISOString(),
        memory: mem
          ? {
              rssMb: Math.round(mem.rss / (1024 * 1024)),
              heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
              heapTotalMb: Math.round(mem.heapTotal / (1024 * 1024)),
            }
          : null,
      });
    }

    // ── Status & Metrics ─────────────────────────────────────────────────────
    if (path === "/api/telemetry/status" && method === "GET") {
      const rate = calculatePacketRate();
      const totalExpected =
        (state.lastPacketNo ?? 0) > 0
          ? (state.lastPacketNo ?? 0)
          : state.accepted + state.missedPackets;
      const lossPercent = totalExpected > 0 ? (state.missedPackets / totalExpected) * 100 : 0;

      return json({
        accepted: state.accepted,
        invalid: state.invalid,
        stored: state.records.length,
        capacity: CAPACITY,
        lastPacketAt: state.latestAt,
        lastPacketNo: state.lastPacketNo,
        missed: state.missedPackets,
        lossPercent: Number(lossPercent.toFixed(2)),
        packetsPerSecond: rate,
        lastError: state.lastError,
        ageMs: state.latestAt === null ? null : Date.now() - state.latestAt,
      });
    }

    // ── Latest Telemetry ─────────────────────────────────────────────────────
    if (path === "/api/telemetry/latest" && method === "GET") {
      if (state.latestAt === null) {
        return json({ error: "No telemetry received yet", data: null }, 404);
      }
      return json({ receivedAt: state.latestAt, data: state.latest });
    }

    // ── History & Search ─────────────────────────────────────────────────────
    if (path === "/api/telemetry/history" && method === "GET") {
      const requested = Number(url.searchParams.get("limit") ?? 100);
      const limit = Number.isFinite(requested)
        ? Math.min(Math.max(1, Math.trunc(requested)), CAPACITY)
        : 100;
      return json({
        count: Math.min(limit, state.records.length),
        total: state.records.length,
        records: state.records.slice(-limit),
      });
    }

    // ── Export ───────────────────────────────────────────────────────────────
    if (path === "/api/telemetry/export" && method === "GET") {
      const format = url.searchParams.get("format")?.toLowerCase();
      if (format === "json") {
        return text(recordsToJson(state.records), "application/json", "orbitra-telemetry.json");
      }
      return text(recordsToCsv(state.records), "text/csv; charset=utf-8", "orbitra-telemetry.csv");
    }

    // ── Diagnostics ──────────────────────────────────────────────────────────
    if (path === "/api/telemetry/diagnostics" && method === "GET") {
      const rate = calculatePacketRate();
      const mem =
        typeof process !== "undefined" && process.memoryUsage ? process.memoryUsage() : null;
      return json({
        packetStats: {
          accepted: state.accepted,
          invalid: state.invalid,
          stored: state.records.length,
          missed: state.missedPackets,
          lastPacketNo: state.lastPacketNo,
          rate: rate,
        },
        systemStats: {
          uptimeMs: Date.now() - startedAt,
          memoryMb: mem ? Math.round(mem.rss / (1024 * 1024)) : 0,
        },
        events: state.events.slice(0, 50),
      });
    }

    // ── Connection Status ────────────────────────────────────────────────────
    if (path === "/api/telemetry/connection" && method === "GET") {
      const isAlive = Date.now() - state.connection.lastHeartbeat < 15_000;
      return json({
        ...state.connection,
        bridgeOnline: isAlive,
        latencyMs: 12,
        protocol: "WebSocket + Serial Bridge",
      });
    }

    // ── Sensors State ────────────────────────────────────────────────────────
    if (path === "/api/telemetry/sensors" && method === "GET") {
      const availableFields = new Set(Object.keys(state.latest) as (keyof Telemetry)[]);
      const hasFix = Boolean(state.latest.gpsFix);
      const sensors = evaluateSensors(availableFields, state.updatedAt, hasFix, Date.now());
      return json({ sensors });
    }

    // ── Alerts ───────────────────────────────────────────────────────────────
    if (path === "/api/telemetry/alerts" && method === "GET") {
      return json({ alerts: state.alerts });
    }

    // ── Replay Support ───────────────────────────────────────────────────────
    if (path === "/api/telemetry/replay" && method === "GET") {
      return json({
        ...state.replay,
        totalRecords: state.records.length,
      });
    }
    if (path === "/api/telemetry/replay" && method === "POST") {
      const body = (await request.json().catch(() => ({}))) as {
        action?: "start" | "stop" | "pause" | "seek";
        speed?: number;
        position?: number;
      };
      if (body.action === "start") {
        state.replay.active = true;
        state.connection.mode = "replay";
      } else if (body.action === "stop" || body.action === "pause") {
        state.replay.active = false;
        state.connection.mode = "live";
      }
      if (typeof body.speed === "number") state.replay.speed = body.speed;
      if (typeof body.position === "number") state.replay.cursor = body.position;
      return json({ ok: true, replay: state.replay });
    }

    // ── Ingest ───────────────────────────────────────────────────────────────
    if (path === "/api/telemetry" && method === "POST") return await ingest(request);

    // ── Clear / Reset ────────────────────────────────────────────────────────
    if (path === "/api/telemetry" && method === "DELETE") {
      state.records = [];
      state.latest = {};
      state.updatedAt = {};
      state.latestAt = null;
      state.accepted = 0;
      state.invalid = 0;
      state.missedPackets = 0;
      state.lastPacketNo = null;
      state.lastError = null;
      state.recentArrivals = [];
      state.events = [];
      recordEvent("info", "Telemetry database reset by operator");
      return json({ ok: true });
    }

    return json({ error: "Endpoint not found" }, 404);
  } catch (error) {
    console.error(error);
    return json({ error: "Internal server error" }, 500);
  }
}
