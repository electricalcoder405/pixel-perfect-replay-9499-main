import { useId } from "react";
import { cn } from "@/lib/utils";

const PX_PER_DEGREE = 2.2;
const MAX_PITCH_SHOWN = 60;

export interface ArtificialHorizonProps {
  /** Normalised roll in degrees; positive banks right. */
  roll: number;
  /** Normalised pitch in degrees; positive is nose up. */
  pitch: number;
  /** False while the hardware has not provided attitude: the instrument is dimmed. */
  available?: boolean;
  className?: string;
}

/**
 * Attitude indicator. The sky/ground disc rotates against the roll and slides with the
 * pitch; the fixed symbol in the middle is the spacecraft. SVG only, no dependencies.
 */
export function ArtificialHorizon({ roll, pitch, available = true, className }: ArtificialHorizonProps) {
  const clipId = useId();
  const r = available && Number.isFinite(roll) ? roll : 0;
  const p = available && Number.isFinite(pitch) ? Math.max(-MAX_PITCH_SHOWN, Math.min(MAX_PITCH_SHOWN, pitch)) : 0;
  const ladder = [-40, -30, -20, -10, 10, 20, 30, 40];
  const ticks = [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60];

  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label={available ? `Artificial horizon: roll ${r.toFixed(1)} degrees, pitch ${p.toFixed(1)} degrees` : "Artificial horizon: no attitude data"}
      className={cn("h-full w-full", !available && "opacity-40", className)}
    >
      <defs>
        <clipPath id={clipId}><circle cx="100" cy="100" r="82" /></clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <g transform={`rotate(${-r} 100 100)`}>
          <g transform={`translate(0 ${p * PX_PER_DEGREE})`}>
            <rect x="-120" y="-300" width="440" height="400" fill="color-mix(in oklab, var(--cyan) 28%, #06101c)" />
            <rect x="-120" y="100" width="440" height="400" fill="color-mix(in oklab, var(--copper) 45%, #140a04)" />
            <line x1="-120" y1="100" x2="320" y2="100" stroke="var(--amber)" strokeWidth="1.5" />
            {ladder.map((deg) => {
              const y = 100 - deg * PX_PER_DEGREE;
              const half = deg % 20 === 0 ? 22 : 12;
              return (
                <g key={deg} stroke="white" strokeOpacity="0.8" strokeWidth="1" fill="white" fillOpacity="0.8">
                  <line x1={100 - half} y1={y} x2={100 + half} y2={y} />
                  {deg % 20 === 0 && (
                    <>
                      <text x={100 - half - 4} y={y + 3} fontSize="8" textAnchor="end" stroke="none">{Math.abs(deg)}</text>
                      <text x={100 + half + 4} y={y + 3} fontSize="8" textAnchor="start" stroke="none">{Math.abs(deg)}</text>
                    </>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </g>

      {/* Roll scale (fixed) with a pointer that turns with the roll. */}
      <g stroke="var(--muted-foreground)" strokeWidth="1">
        {ticks.map((deg) => (
          <line key={deg} x1="100" y1="14" x2="100" y2={deg % 30 === 0 || Math.abs(deg) === 45 ? 22 : 18} transform={`rotate(${deg} 100 100)`} />
        ))}
      </g>
      <g transform={`rotate(${-r} 100 100)`}>
        <path d="M100 25 L95 35 L105 35 Z" fill="var(--amber)" />
      </g>
      <path d="M100 12 L96 5 L104 5 Z" fill="var(--cyan)" />

      <circle cx="100" cy="100" r="82" fill="none" stroke="var(--border)" strokeWidth="2" />
      <circle cx="100" cy="100" r="90" fill="none" stroke="var(--copper)" strokeOpacity="0.5" strokeWidth="1" />

      {/* Spacecraft reference symbol. */}
      <g stroke="var(--amber)" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M60 100 H88 V108" />
        <path d="M140 100 H112 V108" />
      </g>
      <circle cx="100" cy="100" r="3" fill="var(--amber)" />

      {!available && (
        <text x="100" y="150" textAnchor="middle" fontSize="9" fill="var(--muted-foreground)" className="font-data">NO ATTITUDE DATA</text>
      )}
    </svg>
  );
}
