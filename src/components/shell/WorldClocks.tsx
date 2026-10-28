import { useMemo } from "react";
import { useNow } from "@/hooks/use-now";
import { Eyebrow } from "@/components/ds";

interface ZoneSpec {
  readonly label: string;
  readonly timeZone: string;
}

const ZONES: readonly ZoneSpec[] = [
  { label: "UTC", timeZone: "UTC" },
  { label: "IST", timeZone: "Asia/Kolkata" },
];

/** UTC and IST clocks, driven by one shared timer. */
export function WorldClocks() {
  const now = useNow(1000);
  const formatters = useMemo(
    () => ZONES.map((z) => new Intl.DateTimeFormat("en-GB", { timeZone: z.timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })),
    [],
  );
  return (
    <div className="flex items-center gap-4" role="group" aria-label="World clocks">
      {ZONES.map((zone, i) => (
        <div key={zone.label} className="leading-tight">
          <Eyebrow>{zone.label}</Eyebrow>
          <time dateTime={now.toISOString()} className="num block text-sm text-foreground">
            {formatters[i]?.format(now)}
          </time>
        </div>
      ))}
    </div>
  );
}
