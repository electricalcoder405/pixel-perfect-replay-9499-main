import { describe, expect, it } from "vitest";
import { TelemetryStore } from "../store";
import type { PacketParser } from "../sources/types";
import { WebSocketSource, type WebSocketLike } from "../sources/websocket";

class FakeSocket implements WebSocketLike {
  readyState = 0;
  onopen: ((e: unknown) => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onclose: ((e: { code: number; reason: string }) => void) | null = null;
  closed = false;
  close() { this.closed = true; this.readyState = 3; }
  open() { this.readyState = 1; this.onopen?.({}); }
  message(data: unknown) { this.onmessage?.({ data }); }
  drop(code = 1006) { this.readyState = 3; this.onclose?.({ code, reason: "" }); }
}

const parse: PacketParser = (message) => {
  try {
    const raw = JSON.parse(message) as { packetNo?: number; temperature?: number };
    if (typeof raw.packetNo !== "number") return { ok: false, reason: "missing packetNo" };
    return { ok: true, fields: typeof raw.temperature === "number" ? { temperature: raw.temperature } : {}, packetNo: raw.packetNo, timestamp: null };
  } catch {
    return { ok: false, reason: "JSON parse error" };
  }
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function setup(extra: { staleTimeoutMs?: number; backoffBaseMs?: number } = {}) {
  const sockets: FakeSocket[] = [];
  const source = new WebSocketSource({
    url: "ws://test", parse, ...extra,
    createSocket: () => { const s = new FakeSocket(); sockets.push(s); return s; },
  });
  const store = new TelemetryStore();
  store.setSource(source, "ws:test");
  store.start();
  return { sockets, store, source };
}

describe("WebSocketSource", () => {
  it("shows no data until the first packet, then marks fields available", () => {
    const { sockets, store } = setup();
    expect(store.getSnapshot().connection.state).toBe("connecting");
    sockets[0]?.open();
    expect(store.getSnapshot().connection.state).toBe("connected");
    expect(store.getSnapshot().available.size).toBe(0);
    sockets[0]?.message(JSON.stringify({ packetNo: 1, temperature: 29.1 }));
    expect(store.getSnapshot().data.temperature).toBe(29.1);
    expect(store.getSnapshot().available.has("temperature")).toBe(true);
    store.stop();
  });

  it("reports unparseable and non-text messages as invalid", () => {
    const { sockets, store } = setup();
    sockets[0]?.open();
    sockets[0]?.message("not json");
    sockets[0]?.message(new ArrayBuffer(2));
    expect(store.getSnapshot().diagnostics.invalid).toBe(2);
    store.stop();
  });

  it("goes stale without packets and recovers when one arrives", async () => {
    const { sockets, store } = setup({ staleTimeoutMs: 20 });
    sockets[0]?.open();
    await wait(50);
    expect(store.getSnapshot().connection.state).toBe("stale");
    sockets[0]?.message(JSON.stringify({ packetNo: 1, temperature: 20 }));
    expect(store.getSnapshot().connection.state).toBe("connected");
    store.stop();
  });

  it("reconnects after the link drops", async () => {
    const { sockets, store } = setup({ backoffBaseMs: 10 });
    sockets[0]?.open();
    sockets[0]?.drop(1006);
    expect(store.getSnapshot().connection.state).toBe("reconnecting");
    expect(store.getSnapshot().diagnostics.events.some((e) => e.type === "disconnected")).toBe(true);
    await wait(40);
    expect(sockets.length).toBe(2);
    sockets[1]?.open();
    expect(store.getSnapshot().connection.state).toBe("connected");
    store.stop();
  });

  it("stops cleanly: closes the socket and does not reconnect", async () => {
    const { sockets, store } = setup({ backoffBaseMs: 10 });
    sockets[0]?.open();
    store.stop();
    expect(sockets[0]?.closed).toBe(true);
    await wait(40);
    expect(sockets.length).toBe(1);
    expect(store.getSnapshot().connection.state).toBe("idle");
  });
});
