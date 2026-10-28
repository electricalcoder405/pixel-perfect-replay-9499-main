import { cn } from "@/lib/utils";
import { toneText, type Tone } from "@/design/tokens";

/**
 * Small coloured indicator. Colour is never the only signal: pass `label` so
 * assistive technology announces the meaning; without it the dot is decorative.
 */
export function StatusDot({
  tone = "ok",
  pulse = false,
  label,
  className,
}: {
  tone?: Tone;
  pulse?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full bg-current shadow-[0_0_8px_currentColor]",
        toneText[tone],
        pulse && "animate-[pulse-led_1.6s_ease-in-out_infinite]",
        className,
      )}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    />
  );
}
