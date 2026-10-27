import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toneSurface, type Tone } from "@/design/tokens";
import { StatusDot } from "./StatusDot";

/** Compact status chip: a tone-coloured label with an optional indicator dot. */
export function StatusBadge({ tone = "neutral", dot = true, pulse = false, children, className }: { tone?: Tone; dot?: boolean; pulse?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-data text-2xs font-medium uppercase tracking-[0.12em]", toneSurface[tone], className)}>
      {dot && <StatusDot tone={tone} pulse={pulse} />}
      {children}
    </span>
  );
}
