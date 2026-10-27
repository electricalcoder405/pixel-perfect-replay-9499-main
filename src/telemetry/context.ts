import { createContext } from "react";
import type { TelemetryStore } from "./store";

export const TelemetryContext = createContext<TelemetryStore | null>(null);
