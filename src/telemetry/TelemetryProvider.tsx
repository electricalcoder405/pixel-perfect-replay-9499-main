import { useEffect, useRef, useState, type ReactNode } from "react";
import { TelemetryContext } from "./context";
import { createTelemetrySource, sourceKey, type TelemetryConfig } from "./sources/factory";
import { TelemetryStore } from "./store";

/**
 * Owns the telemetry store and runs the configured source.
 * Changing `config.source` (for example from the simulator to a WebSocket) restarts
 * the stream with no other code changes.
 */
export function TelemetryProvider({ config, children }: { config: TelemetryConfig; children: ReactNode }) {
  const configRef = useRef(config);
  configRef.current = config;
  const key = sourceKey(config.source);

  // Created during render so the first paint (and server render) already has initial values.
  // Nothing starts here: starting is a side effect and belongs in useEffect.
  const [store] = useState(() => {
    const created = new TelemetryStore();
    created.setSource(createTelemetrySource(config.source), key);
    return created;
  });

  useEffect(() => {
    if (store.sourceKey !== key) store.setSource(createTelemetrySource(configRef.current.source), key);
    store.start();
    return () => store.stop();
  }, [store, key]);

  return <TelemetryContext.Provider value={store}>{children}</TelemetryContext.Provider>;
}
