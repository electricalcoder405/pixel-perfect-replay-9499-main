/**
 * Tracks the receiver's packet counter.
 *
 * Rules:
 *  - next = previous + 1 → in sequence.
 *  - number equal to the previous one → duplicate.
 *  - number more than previous + 1 → packet loss; (number - previous - 1) packets missed.
 *  - number lower than the previous one → the receiver restarted. This is NOT packet
 *    loss: the baseline is reset and nothing is added to the missed count.
 */
export type PacketEvent =
  | { readonly kind: "first" }
  | { readonly kind: "sequential" }
  | { readonly kind: "duplicate" }
  | { readonly kind: "gap"; readonly missed: number }
  | { readonly kind: "restart"; readonly previous: number };

export interface PacketStats {
  /** Every packet number observed, including duplicates. */
  readonly received: number;
  readonly duplicates: number;
  /** Packets skipped by the receiver (excludes restarts). */
  readonly missed: number;
  /** Times the counter decreased. */
  readonly restarts: number;
  readonly lastPacketNo: number | null;
  /** missed / (unique received + missed) as a percentage, 0 when nothing was received. */
  readonly lossPercent: number;
}

export class PacketTracker {
  private last: number | null = null;
  private received = 0;
  private duplicates = 0;
  private missed = 0;
  private restarts = 0;

  observe(packetNo: number): PacketEvent {
    this.received += 1;
    const previous = this.last;
    this.last = packetNo;

    if (previous === null) return { kind: "first" };
    if (packetNo === previous) {
      this.duplicates += 1;
      return { kind: "duplicate" };
    }
    if (packetNo < previous) {
      this.restarts += 1;
      return { kind: "restart", previous };
    }
    const missed = packetNo - previous - 1;
    if (missed > 0) {
      this.missed += missed;
      return { kind: "gap", missed };
    }
    return { kind: "sequential" };
  }

  get stats(): PacketStats {
    const unique = this.received - this.duplicates;
    const expected = unique + this.missed;
    return {
      received: this.received,
      duplicates: this.duplicates,
      missed: this.missed,
      restarts: this.restarts,
      lastPacketNo: this.last,
      lossPercent: expected > 0 ? (this.missed / expected) * 100 : 0,
    };
  }

  reset(): void {
    this.last = null;
    this.received = 0;
    this.duplicates = 0;
    this.missed = 0;
    this.restarts = 0;
  }
}
