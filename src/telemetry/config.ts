import { parseBridgePacket } from "./parser";
import type { TelemetryConfig } from "./sources/factory";

/**
 * Where telemetry comes from. Simulator and live mode share the same provider and store;
 * only the source differs.
 *
 * Switch with an environment variable (build time):
 *   VITE_TELEMETRY_MODE=live            (default: simulator)
 *   VITE_TELEMETRY_WS_URL=ws://localhost:8081
 * or at runtime from the browser console / a future Settings page:
 *   setTelemetryMode("live", "ws://localhost:8081")   // saves the choice and reloads
 */
export type TelemetryMode = "simulator" | "live";

export const DEFAULT_WS_URL = "ws://localhost:8081";
const STORAGE_KEY = "orbitra.telemetry";

interface StoredChoice {
  mode: TelemetryMode;
  url?: string;
}

function env(key: string): string | undefined {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

function readStoredChoice(): StoredChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredChoice>;
    if (parsed.mode !== "simulator" && parsed.mode !== "live") return null;
    return parsed.url ? { mode: parsed.mode, url: parsed.url } : { mode: parsed.mode };
  } catch {
    return null;
  }
}

export function resolveTelemetryConfig(): TelemetryConfig {
  const stored = readStoredChoice();
  const mode: TelemetryMode = stored?.mode ?? (env("VITE_TELEMETRY_MODE") === "live" ? "live" : "simulator");
  if (mode === "simulator") return { source: { kind: "simulator" } };
  const url = stored?.url ?? env("VITE_TELEMETRY_WS_URL") ?? DEFAULT_WS_URL;
  return { source: { kind: "websocket", url, parse: parseBridgePacket, staleTimeoutMs: 10_000 } };
}

export const telemetryConfig: TelemetryConfig = resolveTelemetryConfig();

export function getTelemetryMode(): TelemetryMode {
  return telemetryConfig.source.kind === "websocket" ? "live" : "simulator";
}

/** Saves the choice and reloads so the single provider restarts with the new source. */
export function setTelemetryMode(mode: TelemetryMode, url?: string): void {
  if (typeof window === "undefined") return;
  try {
    const choice: StoredChoice = url ? { mode, url } : { mode };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
  } catch {
    // Storage unavailable: the environment variables still apply.
  }
  window.location.reload();
}
