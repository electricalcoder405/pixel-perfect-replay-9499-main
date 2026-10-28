export type CountdownState =
  | { readonly state: "unscheduled" }
  | { readonly state: "before"; readonly days: number; readonly hours: number; readonly minutes: number; readonly seconds: number }
  | { readonly state: "after"; readonly elapsedSeconds: number };

/** Time remaining until `target`, or elapsed since it. A null target means no schedule yet. */
export function getCountdown(target: Date | null, now: Date): CountdownState {
  if (target === null) return { state: "unscheduled" };
  const diffMs = target.getTime() - now.getTime();
  if (!Number.isFinite(diffMs)) return { state: "unscheduled" };
  if (diffMs <= 0) return { state: "after", elapsedSeconds: Math.floor(-diffMs / 1000) };
  const total = Math.floor(diffMs / 1000);
  return {
    state: "before",
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}
