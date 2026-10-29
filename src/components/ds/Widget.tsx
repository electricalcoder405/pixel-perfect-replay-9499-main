import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { StateMessage } from "./StateMessage";
import { Surface } from "./Surface";

export type WidgetState = "ready" | "loading" | "empty" | "error";
export type WidgetSpan = "full" | "twoThirds" | "half" | "third" | "quarter";

/** Column spans on the 6-column tablet grid and the 12-column desktop grid. Phones stack. */
const spanClass: Record<WidgetSpan, string> = {
  full: "md:col-span-6 xl:col-span-12",
  twoThirds: "md:col-span-6 xl:col-span-8",
  half: "md:col-span-3 xl:col-span-6",
  third: "md:col-span-3 xl:col-span-4",
  quarter: "md:col-span-3 xl:col-span-3",
};

export interface WidgetProps {
  title: string;
  icon?: ReactNode;
  /** Right-aligned status in the header, e.g. a StatusBadge. */
  status?: ReactNode;
  actions?: ReactNode;
  /** ready renders children; the other states render a standard placeholder instead. */
  state?: WidgetState;
  /** Content for state="empty". */
  empty?: { title: string; description?: string; icon?: ReactNode };
  /** Message for state="error". */
  errorMessage?: string;
  span?: WidgetSpan;
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
}

/**
 * The standard container for every dashboard panel: titled header, consistent padding,
 * and built-in loading, empty and error states with aerospace styling.
 */
export function Widget({
  title,
  icon,
  status,
  actions,
  state = "ready",
  empty,
  errorMessage,
  span = "full",
  className,
  bodyClassName,
  children,
}: WidgetProps) {
  const headingId = useId();
  return (
    <Surface
      as="section"
      padding="none"
      aria-labelledby={headingId}
      className={cn("flex min-w-0 flex-col overflow-hidden shadow-elevation-1", spanClass[span], className)}
    >
      <header className="flex items-center gap-2.5 border-b border-border/70 bg-surface-1/50 px-4 py-2.5">
        {icon && (
          <span className="flex items-center text-cyan shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
        <h2 id={headingId} className="eyebrow text-foreground! tracking-[0.14em] font-semibold text-2xs truncate">
          {title}
        </h2>
        <span className="ml-auto flex items-center gap-2 shrink-0">
          {status}
          {actions}
        </span>
      </header>
      <div className={cn("flex-1 p-4", bodyClassName)} aria-busy={state === "loading" || undefined}>
        {state === "loading" && <WidgetSkeleton />}
        {state === "empty" && (
          <StateMessage
            title={empty?.title ?? "No data yet"}
            {...(empty?.description ? { description: empty.description } : {})}
            {...(empty?.icon ? { icon: empty.icon } : {})}
          />
        )}
        {state === "error" && (
          <StateMessage
            tone="crit"
            title="Telemetry fault"
            description={errorMessage ?? "This subsystem panel could not be loaded."}
          />
        )}
        {state === "ready" && children}
      </div>
    </Surface>
  );
}

/** Placeholder lines shown while a widget's data is loading. */
export function WidgetSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      <Skeleton className="h-5 w-1/3 rounded bg-surface-2" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className="h-3.5 w-full rounded bg-surface-2/80" style={{ width: `${100 - i * 14}%` }} />
      ))}
    </div>
  );
}

/** Responsive grid that Widgets lay themselves out in. */
export function WidgetGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12", className)}>
      {children}
    </div>
  );
}
