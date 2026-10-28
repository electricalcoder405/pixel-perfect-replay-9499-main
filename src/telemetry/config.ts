import { useSyncExternalStore } from "react";
import { parseBridgePacket } from "./parser";
import type { TelemetryConfig } from "./sources/factory";

/**
 * Two completely separate telemetry modes:
 *
 * 1. Demo Mode ("demo" / "simulator"):
 *    - Presentations, testing, dev, UI showcase.
 *    - Uses internal telemetry simulator.
 *    - No hardware required.
 *
 * 2. Ground Controller Mode ("ground-controller" / "live"):
 *    - Real ORBITRA competition.
 *    - Displays ONLY real telemetry received from the ground station.
 *    - No simulated values, no fake values, no mock packets.
 *    - Displays "Waiting for Ground Controller..." whenever telemetry is unavailable.
 */
export type TelemetryMode = "demo" | "ground-controller";

// Accepted input values for backwards compatibility
export type TelemetryModeInput = "demo" | "ground-controller" | "simulator" | "live";

export const DEFAULT_WS_URL = "ws://localhost:8081";
const STORAGE_KEY = "orbitra.telemetry";

export interface TelemetrySettings {
  mode: TelemetryMode;
  url: string;
  heartbeatIntervalMs: number;
  staleTimeoutMs: number;
  backoffBaseMs: number;
  simRate: number;
  simNoise: "none" | "low" | "medium" | "high";
  units: {
    temp: "C" | "F";
    accel: "g" | "ms2";
    altitude: "m" | "ft";
  };
}

const DEFAULT_SETTINGS: TelemetrySettings = {
  mode: "demo",
  url: DEFAULT_WS_URL,
  heartbeatIntervalMs: 5_000,
  staleTimeoutMs: 10_000,
  backoffBaseMs: 1_000,
  simRate: 1.0,
  simNoise: "low",
  units: {
    temp: "C",
    accel: "g",
    altitude: "m",
  },
};

function normalizeMode(input?: string | null): TelemetryMode {
  if (input === "ground-controller" || input === "live") return "ground-controller";
  return "demo";
}

function env(key: string): string | undefined {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

function readStoredSettings(): TelemetrySettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const envMode = env("VITE_TELEMETRY_MODE");
      const envUrl = env("VITE_TELEMETRY_WS_URL");
      return {
        ...DEFAULT_SETTINGS,
        mode: envMode ? normalizeMode(envMode) : DEFAULT_SETTINGS.mode,
        url: envUrl ?? DEFAULT_SETTINGS.url,
      };
    }
    const parsed = JSON.parse(raw) as Partial<TelemetrySettings>;
    return {
      mode: normalizeMode(parsed.mode),
      url: parsed.url ?? env("VITE_TELEMETRY_WS_URL") ?? DEFAULT_WS_URL,
      heartbeatIntervalMs: parsed.heartbeatIntervalMs ?? DEFAULT_SETTINGS.heartbeatIntervalMs,
      staleTimeoutMs: parsed.staleTimeoutMs ?? DEFAULT_SETTINGS.staleTimeoutMs,
      backoffBaseMs: parsed.backoffBaseMs ?? DEFAULT_SETTINGS.backoffBaseMs,
      simRate: parsed.simRate ?? DEFAULT_SETTINGS.simRate,
      simNoise: parsed.simNoise ?? DEFAULT_SETTINGS.simNoise,
      units: {
        temp: parsed.units?.temp ?? "C",
        accel: parsed.units?.accel ?? "g",
        altitude: parsed.units?.altitude ?? "m",
      },
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

let activeSettings: TelemetrySettings = readStoredSettings();

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function buildTelemetryConfig(
  mode = activeSettings.mode,
  url = activeSettings.url,
): TelemetryConfig {
  if (mode === "demo") {
    return {
      source: {
        kind: "simulator",
      },
    };
  }
  return {
    source: {
      kind: "websocket",
      url,
      parse: parseBridgePacket,
      staleTimeoutMs: activeSettings.staleTimeoutMs,
      heartbeatIntervalMs: activeSettings.heartbeatIntervalMs,
      backoffBaseMs: activeSettings.backoffBaseMs,
    },
  };
}

export function resolveTelemetryConfig(): TelemetryConfig {
  return buildTelemetryConfig(activeSettings.mode, activeSettings.url);
}

export let telemetryConfig: TelemetryConfig = resolveTelemetryConfig();

export function getTelemetryMode(): TelemetryMode {
  return activeSettings.mode;
}

export function getWsUrl(): string {
  return activeSettings.url;
}

export function getTelemetrySettings(): TelemetrySettings {
  return { ...activeSettings };
}

/**
 * Changes telemetry mode globally and notifies all TelemetryProviders and UI subscribers.
 */
export function setTelemetryMode(modeInput: TelemetryModeInput, url?: string): void {
  const nextMode = normalizeMode(modeInput);
  updateTelemetrySettings({
    mode: nextMode,
    ...(url ? { url } : {}),
  });
}

/**
 * Updates any subset of telemetry settings, persists to localStorage, and updates active config.
 */
export function updateTelemetrySettings(partial: Partial<TelemetrySettings>): void {
  activeSettings = {
    ...activeSettings,
    ...partial,
    ...(partial.mode ? { mode: normalizeMode(partial.mode) } : {}),
    units: {
      ...activeSettings.units,
      ...(partial.units ?? {}),
    },
  };

  telemetryConfig = buildTelemetryConfig(activeSettings.mode, activeSettings.url);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(activeSettings));
    } catch {
      // storage unavailable
    }
  }

  notify();
}

/** Subscribe to telemetry mode & settings changes */
export function subscribeTelemetryMode(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/** React hook for reading and updating the global mission telemetry source and settings */
export function useTelemetryMode() {
  const settings = useSyncExternalStore(
    subscribeTelemetryMode,
    () => activeSettings,
    () => DEFAULT_SETTINGS,
  );

  return {
    settings,
    mode: settings.mode,
    isDemo: settings.mode === "demo",
    isGroundController: settings.mode === "ground-controller",
    wsUrl: settings.url,
    setMode: (nextMode: TelemetryModeInput, nextUrl?: string) => {
      setTelemetryMode(nextMode, nextUrl);
    },
    updateSettings: (partial: Partial<TelemetrySettings>) => {
      updateTelemetrySettings(partial);
    },
  };
}
