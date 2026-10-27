import { initialTelemetry, type Telemetry } from "../model";
import { simulate } from "../simulator";
import type { TelemetrySink, TelemetrySource } from "./types";

export interface SimulatorOptions {
  /** Milliseconds between samples. Default 1000. */
  intervalMs?: number;
  /** Random source, injectable for tests. */
  rand?: () => number;
}

/** Generates plausible telemetry for every field, so the dashboard works without hardware. */
export class SimulatorSource implements TelemetrySource {
  readonly info = { kind: "simulator", label: "Simulator" } as const;
  private current: Telemetry = initialTelemetry;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly intervalMs: number;
  private readonly rand: () => number;

  constructor(options: SimulatorOptions = {}) {
    this.intervalMs = options.intervalMs ?? 1000;
    this.rand = options.rand ?? Math.random;
  }

  getInitialSample() {
    return { fields: { ...initialTelemetry } };
  }

  start(sink: TelemetrySink): void {
    if (this.timer !== null) return;
    sink.setConnection("connected", "Simulated telemetry");
    this.timer = setInterval(() => {
      this.current = simulate(this.current, this.rand);
      sink.publish({ fields: this.current, packetNo: this.current.packetCount, receivedAt: Date.now() });
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
