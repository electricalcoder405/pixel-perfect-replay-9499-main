import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "./Eyebrow";

/** Standard page heading. Every page has exactly one, and it renders the page's only h1. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4 pb-1", className)}>
      <div className="min-w-0 space-y-1.5">
        {eyebrow && <Eyebrow className="text-copper tracking-[0.16em] font-semibold">{eyebrow}</Eyebrow>}
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl antialiased">
          {title}
        </h1>
        {description && (
          <p className="max-w-3xl text-xs md:text-sm text-muted-foreground font-normal leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}
