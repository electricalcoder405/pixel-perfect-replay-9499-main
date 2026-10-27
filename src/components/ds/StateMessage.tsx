import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toneText, type Tone } from "@/design/tokens";

/**
 * Centred message for empty, waiting or error states, e.g. "Waiting for GPS Fix".
 * Announced politely so screen-reader users learn when the state changes.
 */
export function StateMessage({ icon, title, description, tone = "neutral", action, className }: { icon?: ReactNode; title: string; description?: string; tone?: Tone; action?: ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col items-center justify-center gap-2 px-4 py-8 text-center", className)}>
      {icon && <div className={cn("mb-1", toneText[tone])}>{icon}</div>}
      <p className="font-display text-base font-semibold text-foreground">{title}</p>
      {description && <p className="max-w-xs text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
