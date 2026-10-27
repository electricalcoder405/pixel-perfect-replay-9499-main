import { describe, expect, it } from "vitest";
import { PacketTracker } from "../packetTracker";

describe("PacketTracker", () => {
  it("counts in-sequence packets without loss", () => {
    const t = new PacketTracker();
    expect(t.observe(1).kind).toBe("first");
    expect(t.observe(2).kind).toBe("sequential");
    expect(t.observe(3).kind).toBe("sequential");
    expect(t.stats.missed).toBe(0);
    expect(t.stats.lossPercent).toBe(0);
  });
  it("counts skipped packets as missed", () => {
    const t = new PacketTracker();
    t.observe(1);
    expect(t.observe(5)).toEqual({ kind: "gap", missed: 3 });
    expect(t.stats.missed).toBe(3);
    // 2 unique received + 3 missed = 5 expected
    expect(t.stats.lossPercent).toBeCloseTo(60, 6);
  });
  it("treats a decrease as a receiver restart, not packet loss", () => {
    const t = new PacketTracker();
    t.observe(100);
    t.observe(101);
    expect(t.observe(1)).toEqual({ kind: "restart", previous: 101 });
    expect(t.stats.restarts).toBe(1);
    expect(t.stats.missed).toBe(0);
    expect(t.stats.lossPercent).toBe(0);
  });
  it("continues counting from the new baseline after a restart", () => {
    const t = new PacketTracker();
    t.observe(100);
    t.observe(1);
    expect(t.observe(2).kind).toBe("sequential");
    expect(t.observe(5)).toEqual({ kind: "gap", missed: 2 });
    expect(t.stats.missed).toBe(2);
  });
  it("counts duplicates separately and excludes them from loss maths", () => {
    const t = new PacketTracker();
    t.observe(1);
    expect(t.observe(1).kind).toBe("duplicate");
    expect(t.stats.duplicates).toBe(1);
    expect(t.stats.lossPercent).toBe(0);
  });
  it("resets", () => {
    const t = new PacketTracker();
    t.observe(1);
    t.observe(9);
    t.reset();
    expect(t.stats).toEqual({ received: 0, duplicates: 0, missed: 0, restarts: 0, lastPacketNo: null, lossPercent: 0 });
  });
});
