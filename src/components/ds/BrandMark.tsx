import { cn } from "@/lib/utils";

/**
 * Original ORBITRA mark: a planet disc with an inclined orbit and a satellite.
 * Decorative by default; give `label` when it stands alone as the only brand cue.
 */
export function BrandMark({ className, label }: { className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("h-8 w-8 shrink-0", className)}
      fill="none"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <circle cx="24" cy="24" r="9" fill="var(--surface-2)" stroke="var(--copper)" strokeWidth="1.5" />
      <ellipse cx="24" cy="24" rx="20" ry="7.5" transform="rotate(-24 24 24)" stroke="var(--purple)" strokeOpacity="0.8" strokeWidth="1.25" />
      <circle cx="39.5" cy="16.5" r="2.6" fill="var(--amber)" />
    </svg>
  );
}
