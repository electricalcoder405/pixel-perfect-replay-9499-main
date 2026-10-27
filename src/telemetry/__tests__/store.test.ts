import { describe, expect, it } from "vitest";
import { TelemetryStore } from "../store";
import { SimulatorSource } from "../sources/simulator";
import type { TelemetrySink, TelemetrySource } from "../sources/types";

/** A source whose sink the test drives by hand, standing in for live hardware. */
class ManualSource implements TelemetrySource {
  readonly info = { kind: "websocket", label: "Manual" } as const;
  sink: TelemetrySink | null = null;
  getInitialSample() { return null; }
  start(sink: TelemetrySink) { this.sink = sink; }
  stop() { this.sink = null; }
}

function liveStore() {
  const source = new ManualSource();
  const store = new TelemetryStore();
  store.setSource(source, "manual");
  store.start();
  return { source, store, sink: source.sink as TelemetrySink };
}

describe("TelemetryStore (live-style source)", () => {
  it("starts with no available fields", () => {
    const { store } = liveStore();
    expect(store.getSnapshot().available.size).toBe(0);
    expect(store.getSnapshot().lastUpdated).toBeNull();
  });

  it("marks only the fields a packet provided as available", () => {
    const { store, sink } = liveStore();
    sink.publish({ fields: { temperature: 29.1, humidity: 54 }, packetNo: 1, receivedAt: 1000 });
    const s = store.getSnapshot();
    expect(s.available.has("temperature")).toBe(true);
    expect(s.available.has("humidity")).toBe(true);
    expect(s.available.has("battery")).toBe(false);
    expect(s.available.has("yaw")).toBe(false);
    expect(s.updatedAt.temperature).toBe(1000);
  });

  it("merges partial packets without losing earlier fields", () => {
    const { store, sink } = liveStore();
    sink.publish({ fields: { temperature: 29.1 }, packetNo: 1, receivedAt: 1 });
    sink.publish({ fields: { pressure: 1006.7 }, packetNo: 2, receivedAt: 2 });
    const s = store.getSnapshot();
    expect(s.data.temperature).toBe(29.1);
    expect(s.data.pressure).toBe(1006.7);
  });

  it("normalises roll/pitch for display but preserves the raw values", () => {
    const { store, sink } = liveStore();
    sink.publish({ fields: { rollRaw: -507.4, pitchRaw: 434.87 }, packetNo: 1, receivedAt: 1 });
    const { data } = store.getSnapshot();
    expect(data.rollRaw).toBe(-507.4);
    expect(data.pitchRaw).toBe(434.87);
    expect(data.roll).toBeCloseTo(-147.4, 6);
    expect(data.pitch).toBeCloseTo(74.87, 6);
    const point = store.getHistory().at(-1);
    expect(point?.rollRaw).toBe(-507.4);
    expect(point?.roll).toBeCloseTo(-147.4, 2);
  });

  it("forces no GPS fix at (0, 0) even if the source claims a fix", () => {
    const { store, sink } = liveStore();
    sink.publish({ fields: { latitude: 0, longitude: 0, gpsFix: true }, packetNo: 1, receivedAt: 1 });
    expect(store.getSnapshot().data.gpsFix).toBe(false);
  });

  it("derives a GPS fix from coordinates when the source gives no flag", () => {
    const { store, sink } = liveStore();
    sink.publish({ fields: { latitude: 26.73, longitude: 83.43 }, packetNo: 1, receivedAt: 1 });
    expect(store.getSnapshot().data.gpsFix).toBe(true);
  });

  it("treats a packet counter decrease as a receiver restart, not loss", () => {
    const { store, sink } = liveStore();
    for (const n of [10, 11, 12, 1, 2]) sink.publish({ fields: { temperature: 20 }, packetNo: n, receivedAt: n });
    const d = store.getSnapshot().diagnostics;
    expect(d.restarts).toBe(1);
    expect(d.missed).toBe(0);
    expect(d.lossPercent).toBe(0);
    expect(d.events.some((e) => e.type === "receiver-restart")).toBe(true);
  });

  it("records real packet loss", () => {
    const { store, sink } = liveStore();
    for (const n of [1, 2, 6]) sink.publish({ fields: { temperature: 20 }, packetNo: n, receivedAt: n });
    expect(store.getSnapshot().diagnostics.missed).toBe(3);
  });

  it("counts invalid messages and keeps the reason", () => {
    const { store, sink } = liveStore();
    sink.reportInvalid("JSON parse error");
    const d = store.getSnapshot().diagnostics;
    expect(d.invalid).toBe(1);
    expect(d.validationErrors[0]).toContain("JSON parse error");
  });

  it("measures packets per second between arrivals", () => {
    let now = 0;
    const source = new ManualSource();
    const store = new TelemetryStore({ now: () => now });
    store.setSource(source, "manual");
    store.start();
    for (let i = 1; i <= 5; i++) {
      now = i * 500;
      source.sink?.publish({ fields: { temperature: 20 }, packetNo: i, receivedAt: now });
    }
    expect(store.getSnapshot().diagnostics.packetsPerSecond).toBeCloseTo(2, 6);
  });

  it("ignores a replaced source that keeps publishing", () => {
    const first = new ManualSource();
    const store = new TelemetryStore();
    store.setSource(first, "a");
    store.start();
    const staleSink = first.sink as TelemetrySink;
    store.setSource(new ManualSource(), "b");
    store.start();
    staleSink.publish({ fields: { temperature: 99 }, packetNo: 1, receivedAt: 1 });
    expect(store.getSnapshot().available.has("temperature")).toBe(false);
  });

  it("notifies subscribers and returns a new snapshot only when something changed", () => {
    const { store, sink } = liveStore();
    let calls = 0;
    const unsubscribe = store.subscribe(() => { calls += 1; });
    const before = store.getSnapshot();
    expect(store.getSnapshot()).toBe(before);
    sink.publish({ fields: { temperature: 20 }, packetNo: 1, receivedAt: 1 });
    expect(calls).toBeGreaterThan(0);
    expect(store.getSnapshot()).not.toBe(before);
    unsubscribe();
  });

  it("caps the history buffer", () => {
    const source = new ManualSource();
    const store = new TelemetryStore({ historyCapacity: 5, historyView: 3 });
    store.setSource(source, "m");
    store.start();
    for (let i = 1; i <= 10; i++) source.sink?.publish({ fields: { temperature: i }, packetNo: i, receivedAt: i });
    expect(store.getHistory()).toHaveLength(5);
    expect(store.getSnapshot().history).toHaveLength(3);
  });
});

describe("TelemetryStore (simulator source)", () => {
  it("shows initial values immediately, with every field available", () => {
    const store = new TelemetryStore();
    store.setSource(new SimulatorSource(), "simulator");
    const s = store.getSnapshot();
    expect(s.available.has("yaw")).toBe(true);
    expect(s.available.has("battery")).toBe(true);
    expect(s.data.battery).toBe(87);
    expect(s.source.kind).toBe("simulator");
  });

  it("publishes on its interval and reports a connected link", async () => {
    const store = new TelemetryStore();
    store.setSource(new SimulatorSource({ intervalMs: 10 }), "simulator");
    store.start();
    await new Promise((r) => setTimeout(r, 55));
    store.stop();
    const s = store.getSnapshot();
    expect(s.data.packetCount).toBeGreaterThanOrEqual(2);
    expect(s.diagnostics.missed).toBe(0);
    expect(s.connection.state).toBe("idle");
  });

  it("can be switched to another source and resets state", () => {
    const store = new TelemetryStore();
    store.setSource(new SimulatorSource(), "simulator");
    store.setSource(new ManualSource(), "manual");
    expect(store.getSnapshot().available.size).toBe(0);
    expect(store.getSnapshot().source.label).toBe("Manual");
    expect(store.sourceKey).toBe("manual");
  });
});
