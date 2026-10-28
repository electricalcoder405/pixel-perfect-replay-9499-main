import { describe, expect, it } from "vitest";
import { AlertManager } from "../alerts";
import { HistoryReplay, recordsToCsv } from "../history";
import { evaluateSensors } from "../sensorManager";
import { TelemetryStore } from "../store";
import type { TelemetrySink, TelemetrySource } from "../sources/types";

describe("AlertManager", () => {
  it("de-duplicates active alerts and resolves them", () => {
    const m = new AlertManager();
    m.raise({ kind: "gps-lost", key: "gps-lost", level: "warning", message: "x" }, 1);
    m.raise({ kind: "gps-lost", key: "gps-lost", level: "warning", message: "x" }, 2);
    expect(m.list).toHaveLength(1);
    m.resolve("gps-lost", 3);
    expect(m.active).toHaveLength(0);
    m.raise({ kind: "gps-lost", key: "gps-lost", level: "warning", message: "x" }, 4);
    expect(m.list).toHaveLength(2);
  });
});

describe("evaluateSensors", () => {
  it("reports awaiting, ok, offline and degraded GPS", () => {
    const available = new Set(["temperature", "latitude"] as const);
    const fresh = evaluateSensors(
      available,
      { temperature: 9_000, latitude: 9_000 },
      false,
      10_000,
    );
    expect(fresh.find((s) => s.id === "dht11")?.health).toBe("ok");
    expect(fresh.find((s) => s.id === "gps")?.health).toBe("degraded");
    expect(fresh.find((s) => s.id === "bmp280")?.health).toBe("awaiting");
    const old = evaluateSensors(available, { temperature: 1_000, latitude: 1_000 }, true, 10_000);
    expect(old.find((s) => s.id === "dht11")?.health).toBe("offline");
  });
});

describe("store infrastructure", () => {
  function liveStore() {
    let sink: TelemetrySink | null = null;
    const source: TelemetrySource = {
      info: { kind: "websocket", label: "t" },
      getInitialSample: () => null,
      start: (s) => {
        sink = s;
      },
      stop: () => {},
    };
    let clock = 10_000;
    const store = new TelemetryStore({ now: () => clock });
    store.setSource(source, "t");
    store.start();
    return {
      store,
      sink: sink as unknown as TelemetrySink,
      advance: (ms: number) => {
        clock += ms;
      },
    };
  }

  it("tracks mission state and raises/resolves invalid-packet alerts", () => {
    const { store, sink } = liveStore();
    expect(store.getSnapshot().mission.status).toBe("standby");
    sink.setConnection("connected");
    sink.publish({ fields: { temperature: 20 }, packetNo: 1, receivedAt: 10_000 });
    expect(store.getSnapshot().mission.packetCount).toBe(1);
    expect(store.getSnapshot().mission.status).toBe("active");
    sink.reportInvalid("bad");
    expect(
      store.getSnapshot().alerts.some((a) => a.kind === "invalid-packet" && a.resolvedAt === null),
    ).toBe(true);
    sink.publish({ fields: { temperature: 21 }, packetNo: 2, receivedAt: 10_000 });
    expect(store.getSnapshot().alerts.every((a) => a.resolvedAt !== null)).toBe(true);
    store.stop();
  });

  it("raises connection-lost and keeps records for export", () => {
    const { store, sink } = liveStore();
    sink.setConnection("connected");
    sink.publish({ fields: { temperature: 20 }, packetNo: 1, receivedAt: 10_000 });
    sink.setConnection("disconnected", "Code 1006");
    expect(store.getSnapshot().alerts.some((a) => a.kind === "connection-lost")).toBe(true);
    expect(store.getSnapshot().mission.status).toBe("link-lost");
    expect(store.exportCsv().split("\n")).toHaveLength(2);
    store.stop();
  });
});

describe("history", () => {
  it("exports CSV and replays in order", () => {
    const records = [
      { receivedAt: 1, packetNo: 1, data: { temperature: 20 } },
      { receivedAt: 2, packetNo: 2, data: { temperature: 21 } },
    ];
    expect(recordsToCsv(records).split("\n")[1]).toContain(",20");
    const replay = new HistoryReplay(records);
    expect(replay.next()?.packetNo).toBe(1);
    expect(replay.next()?.packetNo).toBe(2);
    expect(replay.next()).toBeNull();
    replay.reset();
    expect(replay.hasNext).toBe(true);
  });
});
