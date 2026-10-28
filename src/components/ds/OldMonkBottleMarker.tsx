import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

interface OldMonkBottleProps extends SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
  className?: string;
}

/**
 * Authentic Old Monk bottle silhouette vector.
 * Distinctive squat rectangular bottle with sloping shoulders, cylindrical neck, and cap.
 */
export function OldMonkBottleSilhouette({
  size = 20,
  color = "var(--amber)",
  className,
  ...props
}: OldMonkBottleProps) {
  return (
    <svg
      viewBox="0 0 24 32"
      width={size}
      height={(size * 32) / 24}
      fill="none"
      className={cn("shrink-0", className)}
      {...props}
    >
      {/* Cap */}
      <rect
        x="9.5"
        y="1"
        width="5"
        height="4"
        rx="0.8"
        fill={color}
        stroke={color}
        strokeWidth="0.5"
      />
      {/* Neck */}
      <rect x="10" y="5" width="4" height="4.5" fill={color} fillOpacity="0.75" />
      {/* Bottle body with distinctive square-sloped shoulders */}
      <path
        d="M 10 9.5
           C 8 11, 4.5 12.5, 4.5 15.5
           L 4.5 28.5
           C 4.5 30.5, 6 31, 8 31
           L 16 31
           C 18 31, 19.5 30.5, 19.5 28.5
           L 19.5 15.5
           C 19.5 12.5, 16 11, 14 9.5
           Z"
        fill="color-mix(in oklab, var(--copper) 85%, black)"
        stroke={color}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Embossed Rum Ribbon / Label banner */}
      <rect
        x="6.5"
        y="17"
        width="11"
        height="7"
        rx="0.75"
        fill={color}
        fillOpacity="0.25"
        stroke={color}
        strokeWidth="0.75"
      />
      <line x1="8" y1="20" x2="16" y2="20" stroke={color} strokeWidth="0.7" strokeLinecap="round" />
      <line
        x1="9"
        y1="22"
        x2="15"
        y2="22"
        stroke={color}
        strokeWidth="0.5"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

/**
 * Recharts custom dot / marker rendered at the active or latest telemetry point.
 * Preserves high readability with pinpoint center crosshair and clear coordinates.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function OldMonkChartMarker(props: any) {
  const { cx, cy, stroke, value, index, dataLength } = props;
  // If only showing on the latest point or hovered point
  const isLatest = dataLength ? index === dataLength - 1 : true;
  if (!cx || !cy || isNaN(cx) || isNaN(cy)) return null;

  // Render a clean pinpoint dot with Old Monk silhouette marker on the latest point
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      {/* Crisp target ring for readability */}
      <circle
        r="4.5"
        fill="var(--background)"
        stroke={stroke || "var(--amber)"}
        strokeWidth="1.5"
      />
      <circle r="1.5" fill={stroke || "var(--amber)"} />
      {isLatest && (
        <g transform="translate(-8, -26)">
          <OldMonkBottleSilhouette size={16} color={stroke || "var(--amber)"} />
        </g>
      )}
    </g>
  );
}
