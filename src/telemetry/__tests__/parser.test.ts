import { describe, expect, it } from "vitest";
import { parseBridgePacket } from "../parser";

describe("parseBridgePacket", () => {
  it("accepts a valid packet and normalises aliases", () => {
    const r = parseBridgePacket(
      JSON.stringify({
        packet: 7,
        temp: "27.5",
        hum: 51,
        lat: 28.6,
        lng: 77.2,
        accel_x: 0.1,
        roll: -507.4,
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.packetNo).toBe(7);
    expect(r.fields.temperature).toBe(27.5);
    expect(r.fields.humidity).toBe(51);
    expect(r.fields.accelerationX).toBe(0.1);
    expect(r.fields.rollRaw).toBe(-507.4);
  });

  it("drops out-of-range values but keeps the rest", () => {
    const r = parseBridgePacket(JSON.stringify({ packetNo: 1, temperature: 999, humidity: 40 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.fields.temperature).toBeUndefined();
    expect(r.fields.humidity).toBe(40);
  });

  it("rejects invalid JSON, non-objects and packets with no usable values", () => {
    expect(parseBridgePacket("not json").ok).toBe(false);
    expect(parseBridgePacket("[1,2]").ok).toBe(false);
    expect(parseBridgePacket(JSON.stringify({ packetNo: 3 })).ok).toBe(false);
    expect(parseBridgePacket(JSON.stringify({ temperature: null, humidity: "abc" })).ok).toBe(
      false,
    );
  });

  it("recognises heartbeats", () => {
    const r = parseBridgePacket(JSON.stringify({ type: "pong" }));
    expect(r.ok && r.heartbeat).toBe(true);
  });

  it("only accepts plausible epoch timestamps", () => {
    const ok = parseBridgePacket(JSON.stringify({ temperature: 20, timestamp: 1_790_000_000_000 }));
    const uptime = parseBridgePacket(JSON.stringify({ temperature: 20, timestamp: 12345 }));
    expect(ok.ok && ok.timestamp).toBe(1_790_000_000_000);
    expect(uptime.ok && uptime.timestamp).toBeNull();
  });
});
