import { useEffect, useState, type ReactNode } from "react";
import { TelemetryContext } from "./context";
import { createTelemetrySource, sourceKey, type TelemetryConfig } from "./sources/factory";
import { TelemetryStore } from "./store";
import { resolveTelemetryConfig, subscribeTelemetryMode } from "./config";

/**
 * Owns the telemetry store and runs the active telemetry source.
 * Dynamically switches between Demo Mode and Ground Controller Mode
 * whenever the global source selection changes, with no page reload required.
 */
export function TelemetryProvider({
  config = resolveTelemetryConfig(),
  children,
}: {
  config?: TelemetryConfig;
  children: ReactNode;
}) {
  const [currentConfig, setCurrentConfig] = useState<TelemetryConfig>(config);
  const key = sourceKey(currentConfig.source);

  // Created during render so the first paint (and server render) already has initial values.
  const [store] = useState(() => {
    const created = new TelemetryStore();
    created.setSource(createTelemetrySource(currentConfig.source), key);
    return created;
  });

  // Dynamically listen for global mode switches (Demo vs Ground Controller)
  useEffect(() => {
    const unsubscribe = subscribeTelemetryMode(() => {
      const next = resolveTelemetryConfig();
      setCurrentConfig(next);
      const nextKey = sourceKey(next.source);
      store.setSource(createTelemetrySource(next.source), nextKey);
    });
    return unsubscribe;
  }, [store]);

  useEffect(() => {
    if (store.sourceKey !== key) {
      store.setSource(createTelemetrySource(currentConfig.source), key);
    }
    store.start();
    return () => store.stop();
  }, [store, key, currentConfig]);

  return <TelemetryContext.Provider value={store}>{children}</TelemetryContext.Provider>;
}
