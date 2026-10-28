export type AlertKind = "sensor-disconnected" | "packet-timeout" | "gps-lost" | "connection-lost" | "invalid-packet";
export type AlertLevel = "info" | "warning" | "critical";

export interface Alert {
  readonly id: number;
  readonly kind: AlertKind;
  /** Identity used to de-duplicate: one active alert per key. */
  readonly key: string;
  readonly level: AlertLevel;
  readonly message: string;
  readonly raisedAt: number;
  /** Null while the condition is still present. */
  readonly resolvedAt: number | null;
  /** Times the message changed while active (e.g. a growing invalid-packet count). */
  readonly count: number;
}

export interface AlertInput {
  readonly kind: AlertKind;
  readonly key: string;
  readonly level: AlertLevel;
  readonly message: string;
}

/**
 * Keeps alerts de-duplicated: raising a condition that is already active updates it
 * instead of adding another entry. `list` is newest first and only changes identity
 * when something actually changed, so it is safe as a React snapshot value.
 */
export class AlertManager {
  private items: readonly Alert[] = [];
  private seq = 0;

  constructor(private readonly capacity = 200) {}

  get list(): readonly Alert[] {
    return this.items;
  }

  get active(): readonly Alert[] {
    return this.items.filter((a) => a.resolvedAt === null);
  }

  raise(input: AlertInput, at: number): void {
    const index = this.items.findIndex((a) => a.key === input.key && a.resolvedAt === null);
    if (index >= 0) {
      const current = this.items[index] as Alert;
      if (current.message === input.message && current.level === input.level) return;
      const next = this.items.slice();
      next[index] = { ...current, message: input.message, level: input.level, count: current.count + 1 };
      this.items = next;
      return;
    }
    this.seq += 1;
    const alert: Alert = { id: this.seq, ...input, raisedAt: at, resolvedAt: null, count: 1 };
    this.items = [alert, ...this.items].slice(0, this.capacity);
  }

  resolve(key: string, at: number): void {
    const index = this.items.findIndex((a) => a.key === key && a.resolvedAt === null);
    if (index < 0) return;
    const next = this.items.slice();
    next[index] = { ...(this.items[index] as Alert), resolvedAt: at };
    this.items = next;
  }

  reset(): void {
    this.items = [];
    this.seq = 0;
  }
}
