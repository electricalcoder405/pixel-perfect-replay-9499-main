import { recordsToCsv, recordsToJson, type TelemetryRecord } from "../telemetry/history";
import type { Telemetry } from "../telemetry/model";
import { parseBridgePacket } from "../telemetry/parser";

/**
 * Telemetry REST API, served by the same server entry as the app (src/server.ts).
 *
 *   GET    /api/health               liveness
 *   GET    /api/telemetry/status     counters and timestamps
 *   GET    /api/telemetry/latest     latest merged packet
 *   GET    /api/telemetry/history    recent records (?limit=, default 100)
 *   GET    /api/telemetry/export     ?format=csv|json
 *   POST   /api/telemetry            ingest one bridge packet (same format the WebSocket carries)
 *   DELETE /api/telemetry            clear stored data
 *
 * Data is held in memory (a ring buffer) and is lost on restart. The parser is the same
 * one the browser uses, so both sides accept exactly the same packets.
 */

const CAPACITY = 5000;
const MAX_BODY_BYTES = 64 * 1024;
const startedAt = Date.now();

const state = {
  records: [] as TelemetryRecord[],
  latest: {} as Partial<Telemetry>,
  latestAt: null as number | null,
  accepted: 0,
  invalid: 0,
  lastError: null as string | null,
};

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
  "access-control-allow-headers": "content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...CORS },
  });
}

function text(body: string, contentType: string, filename: string): Response {
  return new Response(body, {
    headers: { "content-type": contentType, "content-disposition": `attachment; filename="${filename}"`, "cache-control": "no-store", ...CORS },
  });
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
    return json({ ok: false, error: result.reason }, 422);
  }
  if (result.heartbeat) return json({ ok: true, heartbeat: true });

  const receivedAt = result.timestamp ?? Date.now();
  state.latest = { ...state.latest, ...result.fields };
  state.latestAt = receivedAt;
  state.accepted += 1;
  state.records.push({ receivedAt, packetNo: result.packetNo, data: result.fields });
  if (state.records.length > CAPACITY) state.records.splice(0, state.records.length - CAPACITY);
  return json({ ok: true, accepted: state.accepted }, 202);
}

/** Returns a Response for /api/* requests, or null so the app handles everything else. */
export async function handleApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return null;
  const path = url.pathname.replace(/\/+$/, "");
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  try {
    if (path === "/api/health" && method === "GET") {
      return json({ status: "ok", uptimeMs: Date.now() - startedAt, time: new Date().toISOString() });
    }
    if (path === "/api/telemetry/status" && method === "GET") {
      return json({
        accepted: state.accepted,
        invalid: state.invalid,
        stored: state.records.length,
        lastPacketAt: state.latestAt,
        lastError: state.lastError,
        ageMs: state.latestAt === null ? null : Date.now() - state.latestAt,
      });
    }
    if (path === "/api/telemetry/latest" && method === "GET") {
      if (state.latestAt === null) return json({ error: "No telemetry received yet" }, 404);
      return json({ receivedAt: state.latestAt, data: state.latest });
    }
    if (path === "/api/telemetry/history" && method === "GET") {
      const requested = Number(url.searchParams.get("limit") ?? 100);
      const limit = Number.isFinite(requested) ? Math.min(Math.max(1, Math.trunc(requested)), CAPACITY) : 100;
      return json({ count: Math.min(limit, state.records.length), records: state.records.slice(-limit) });
    }
    if (path === "/api/telemetry/export" && method === "GET") {
      return url.searchParams.get("format") === "json"
        ? text(recordsToJson(state.records), "application/json", "orbitra-telemetry.json")
        : text(recordsToCsv(state.records), "text/csv; charset=utf-8", "orbitra-telemetry.csv");
    }
    if (path === "/api/telemetry" && method === "POST") return await ingest(request);
    if (path === "/api/telemetry" && method === "DELETE") {
      state.records = [];
      state.latest = {};
      state.latestAt = null;
      state.accepted = 0;
      state.invalid = 0;
      state.lastError = null;
      return json({ ok: true });
    }
    return json({ error: "Not found" }, 404);
  } catch (error) {
    console.error(error);
    return json({ error: "Internal error" }, 500);
  }
}
