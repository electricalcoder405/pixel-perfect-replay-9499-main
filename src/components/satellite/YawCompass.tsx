import { cn } from "@/lib/utils";

/** Heading dial: the needle points at the yaw angle measured clockwise from 0°. */
export function YawCompass({ yaw, available = true, className }: { yaw: number; available?: boolean; className?: string }) {
  const heading = available && Number.isFinite(yaw) ? ((yaw % 360) + 360) % 360 : 0;
  const marks = Array.from({ length: 36 }, (_, i) => i * 10);
  const cardinals: [string, number][] = [["N", 0], ["E", 90], ["S", 180], ["W", 270]];
  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-label={available ? `Yaw ${heading.toFixed(1)} degrees` : "Yaw: no data"}
      className={cn("h-full w-full", !available && "opacity-40", className)}
    >
      <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" strokeWidth="2" />
      {marks.map((deg) => (
        <line key={deg} x1="60" y1="8" x2="60" y2={deg % 90 === 0 ? 17 : deg % 30 === 0 ? 14 : 11} stroke="var(--muted-foreground)" strokeWidth={deg % 90 === 0 ? 1.5 : 0.8} transform={`rotate(${deg} 60 60)`} />
      ))}
      {cardinals.map(([label, deg]) => {
        const rad = ((deg - 90) * Math.PI) / 180;
        return (
          <text key={label} x={60 + Math.cos(rad) * 33} y={60 + Math.sin(rad) * 33 + 3} textAnchor="middle" fontSize="9" fill={label === "N" ? "var(--amber)" : "var(--muted-foreground)"} className="font-data">{label}</text>
        );
      })}
      <g transform={`rotate(${heading} 60 60)`}>
        <path d="M60 18 L66 62 L60 56 L54 62 Z" fill="var(--cyan)" />
        <path d="M60 102 L56 66 L60 70 L64 66 Z" fill="var(--purple)" fillOpacity="0.7" />
      </g>
      <circle cx="60" cy="60" r="3" fill="var(--amber)" />
    </svg>
  );
}
