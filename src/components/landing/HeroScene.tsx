import { useReducedMotion } from "framer-motion";

const CX = 300;
const CY = 310;
const EARTH_R = 165;
/** Orbit ellipse, drawn tilted. The satellite follows the same path. */
const ORBIT_PATH = "M 20 310 a 280 92 0 1 0 560 0 a 280 92 0 1 0 -560 0";
const MERIDIANS = [0.3, 0.6, 0.85, 1];
const PARALLELS = [-110, -55, 0, 55, 110];

/**
 * Illustrative Earth, orbit and satellite for the landing page. Static vector art:
 * the only motion is the satellite's slow orbit and the ground-station ping, which
 * appears only while telemetry is live (so it signals the real link state).
 * The interactive 3D view lives in the dashboard.
 */
export function HeroScene({ live }: { live: boolean }) {
  const reduceMotion = useReducedMotion();
  return (
    <svg
      viewBox="0 0 600 620"
      className="h-auto w-full"
      role="img"
      aria-label="Illustration of the Earth with a satellite in orbit"
    >
      <defs>
        <radialGradient id="hero-earth" cx="0.34" cy="0.3" r="0.9">
          <stop offset="0" stopColor="color-mix(in oklab, var(--cyan) 34%, oklch(0.2 0.03 240))" />
          <stop offset="0.55" stopColor="oklch(0.2 0.035 245)" />
          <stop offset="1" stopColor="oklch(0.1 0.01 250)" />
        </radialGradient>
        <radialGradient id="hero-shade" cx="0.3" cy="0.28" r="0.95">
          <stop offset="0.45" stopColor="oklch(0.08 0.005 60)" stopOpacity="0" />
          <stop offset="1" stopColor="oklch(0.08 0.005 60)" stopOpacity="0.85" />
        </radialGradient>
        <clipPath id="hero-earth-clip">
          <circle cx={CX} cy={CY} r={EARTH_R} />
        </clipPath>
      </defs>

      {/* Atmosphere */}
      <circle
        cx={CX}
        cy={CY}
        r={EARTH_R + 14}
        fill="none"
        stroke="var(--cyan)"
        strokeOpacity="0.1"
        strokeWidth="10"
      />
      <circle
        cx={CX}
        cy={CY}
        r={EARTH_R + 5}
        fill="none"
        stroke="var(--cyan)"
        strokeOpacity="0.3"
        strokeWidth="2"
      />

      {/* Earth */}
      <circle cx={CX} cy={CY} r={EARTH_R} fill="url(#hero-earth)" />
      <g
        clipPath="url(#hero-earth-clip)"
        fill="none"
        stroke="var(--cyan)"
        strokeOpacity="0.16"
        strokeWidth="1"
      >
        {MERIDIANS.map((k) => (
          <ellipse key={k} cx={CX} cy={CY} rx={EARTH_R * k} ry={EARTH_R} />
        ))}
        {PARALLELS.map((dy) => {
          const rx = Math.sqrt(EARTH_R * EARTH_R - dy * dy);
          return <ellipse key={dy} cx={CX} cy={CY + dy} rx={rx} ry={rx * 0.1} />;
        })}
      </g>
      <circle cx={CX} cy={CY} r={EARTH_R} fill="url(#hero-shade)" />

      {/* Ground station: pings only while the telemetry link is live */}
      <g>
        <circle
          cx={342}
          cy={262}
          r={3.5}
          fill={live ? "var(--success)" : "var(--muted-foreground)"}
        />
        {live && !reduceMotion && (
          <circle
            cx={342}
            cy={262}
            r={3.5}
            fill="none"
            stroke="var(--success)"
            strokeWidth="1.5"
            className="ping-ring"
          />
        )}
      </g>

      {/* Orbit and satellite */}
      <g transform={`rotate(-24 ${CX} ${CY})`}>
        <path
          d={ORBIT_PATH}
          fill="none"
          stroke="var(--purple)"
          strokeOpacity="0.55"
          strokeWidth="1.25"
          strokeDasharray="3 7"
        />
        {reduceMotion ? (
          <g transform="translate(580 310)">
            <Satellite />
          </g>
        ) : (
          <g>
            <Satellite />
            <animateMotion dur="52s" repeatCount="indefinite" path={ORBIT_PATH} />
          </g>
        )}
      </g>
    </svg>
  );
}

/** Small satellite silhouette: body, two solar panels and an antenna. */
function Satellite() {
  return (
    <g strokeLinejoin="round">
      <rect
        x={-36}
        y={-5}
        width={24}
        height={10}
        rx={1}
        fill="color-mix(in oklab, var(--cyan) 14%, transparent)"
        stroke="var(--cyan)"
        strokeWidth="1.2"
      />
      <rect
        x={12}
        y={-5}
        width={24}
        height={10}
        rx={1}
        fill="color-mix(in oklab, var(--cyan) 14%, transparent)"
        stroke="var(--cyan)"
        strokeWidth="1.2"
      />
      <path
        d="M -24 -5 V 5 M 24 -5 V 5"
        stroke="var(--cyan)"
        strokeOpacity="0.5"
        strokeWidth="0.8"
      />
      <path d="M -12 0 H -7 M 7 0 H 12" stroke="var(--muted-foreground)" strokeWidth="1.2" />
      <rect
        x={-7}
        y={-7}
        width={14}
        height={14}
        rx={2}
        fill="var(--surface-3)"
        stroke="var(--amber)"
        strokeWidth="1.4"
      />
      <path d="M 0 -7 V -15" stroke="var(--muted-foreground)" strokeWidth="1.2" />
      <circle cx={0} cy={-16} r={1.8} fill="var(--amber)" />
    </g>
  );
}
