import { describe, expect, it } from "vitest";
import { getCountdown } from "../countdown";
import { findNavItem, findNavItemByPath, NAV_ITEMS } from "../navigation";

describe("navigation config", () => {
  it("has the eleven required sections", () => {
    expect(NAV_ITEMS).toHaveLength(11);
  });
  it("has unique ids and paths, all under /dashboard", () => {
    expect(new Set(NAV_ITEMS.map((i) => i.id)).size).toBe(NAV_ITEMS.length);
    expect(new Set(NAV_ITEMS.map((i) => i.to)).size).toBe(NAV_ITEMS.length);
    for (const item of NAV_ITEMS) expect(item.to.startsWith("/dashboard")).toBe(true);
  });
  it("maps a path to its section, ignoring a trailing slash", () => {
    expect(findNavItemByPath("/dashboard")?.id).toBe("overview");
    expect(findNavItemByPath("/dashboard/")?.id).toBe("overview");
    expect(findNavItemByPath("/dashboard/gps/")?.id).toBe("gps");
    expect(findNavItemByPath("/nope")).toBe(undefined);
  });
  it("finds an item by id", () => {
    expect(findNavItem("diagnostics").label).toBe("Diagnostics");
  });
});

describe("getCountdown", () => {
  const now = new Date("2026-11-01T00:00:00Z");
  it("is unscheduled without a target", () => {
    expect(getCountdown(null, now)).toEqual({ state: "unscheduled" });
  });
  it("splits time remaining into days, hours, minutes, seconds", () => {
    const target = new Date(now.getTime() + ((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000);
    expect(getCountdown(target, now)).toEqual({ state: "before", days: 2, hours: 3, minutes: 4, seconds: 5 });
  });
  it("reports elapsed time after the target", () => {
    const target = new Date(now.getTime() - 90_000);
    expect(getCountdown(target, now)).toEqual({ state: "after", elapsedSeconds: 90 });
  });
  it("treats an invalid date as unscheduled", () => {
    expect(getCountdown(new Date("nope"), now)).toEqual({ state: "unscheduled" });
  });
});
