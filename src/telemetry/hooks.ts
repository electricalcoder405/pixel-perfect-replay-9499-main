import { useContext, useSyncExternalStore } from "react";
import type { ConnectionStatus } from "./connection";
import { TelemetryContext } from "./context";
import type { TelemetryField, TelemetrySnapshot } from "./model";
import type { TelemetryStore } from "./store";

/** The store instance, for imperative access (e.g. reading the full history buffer). */
export function useTelemetryStore(): TelemetryStore {
  const store = useContext(TelemetryContext);
  if (!store) throw new Error("Telemetry hooks must be used inside <TelemetryProvider>.");
  return store;
}

/** The whole snapshot. Re-renders on every update. */
export function useTelemetrySnapshot(): TelemetrySnapshot {
  const store = useTelemetryStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}

/**
 * Subscribes to part of the snapshot. The selector must return a value that keeps its
 * identity while unchanged (a snapshot property, or a primitive), not a new object.
 */
export function useTelemetrySelector<T>(selector: (snapshot: TelemetrySnapshot) => T): T {
  const store = useTelemetryStore();
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getSnapshot()),
    () => selector(store.getServerSnapshot()),
  );
}

export function useConnection(): ConnectionStatus {
  return useTelemetrySelector((s) => s.connection);
}

/** True once the active source has provided a real value for the field. */
export function useFieldAvailable(field: TelemetryField): boolean {
  return useTelemetrySelector((s) => s.available.has(field));
}
