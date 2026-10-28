import { ALL_TELEMETRY_FIELDS, type Telemetry } from "./model";

/** One accepted packet as stored for export and replay. */
export interface TelemetryRecord {
  /** Wall-clock ms the packet was received. */
  readonly receivedAt: number;
  readonly packetNo: number | null;
  /** Full telemetry at that moment (store) or the packet's own fields (backend). */
  readonly data: Partial<Telemetry>;
}

export function recordsToCsv(records: readonly TelemetryRecord[]): string {
  const header = ["receivedAt", "receivedAtIso", "packetNo", ...ALL_TELEMETRY_FIELDS].join(",");
  const rows = records.map((r) => {
    const cells = ALL_TELEMETRY_FIELDS.map((field) => {
      const v = r.data[field];
      return v === undefined ? "" : String(v);
    });
    return [r.receivedAt, new Date(r.receivedAt).toISOString(), r.packetNo ?? "", ...cells].join(",");
  });
  return [header, ...rows].join("\n");
}

export function recordsToJson(records: readonly TelemetryRecord[]): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), count: records.length, records }, null, 2);
}

/** Steps through stored records in order. Foundation for the future replay UI. */
export class HistoryReplay {
  private index = 0;

  constructor(private readonly records: readonly TelemetryRecord[]) {}

  get length(): number {
    return this.records.length;
  }

  get position(): number {
    return this.index;
  }

  get hasNext(): boolean {
    return this.index < this.records.length;
  }

  peek(): TelemetryRecord | null {
    return this.records[this.index] ?? null;
  }

  next(): TelemetryRecord | null {
    const record = this.records[this.index] ?? null;
    if (record) this.index += 1;
    return record;
  }

  seek(index: number): void {
    this.index = Math.min(Math.max(0, Math.trunc(index)), this.records.length);
  }

  reset(): void {
    this.index = 0;
  }
}

/** Browser-only: saves text as a file download. */
export function downloadText(filename: string, text: string, mime: string): void {
  if (typeof document === "undefined") return;
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
