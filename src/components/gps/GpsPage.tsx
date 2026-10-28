import { useState, useMemo } from "react";
import {
  Compass,
  Crosshair,
  Globe,
  MapPin,
  Maximize2,
  Navigation,
  Radio,
  Satellite,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  ConnectionIndicator,
  PageHeader,
  StatusBadge,
  WaitingForGroundBanner,
  Widget,
  WidgetGrid,
} from "@/components/ds";
import { Button } from "@/components/ui/button";
import { formatValue, NO_DATA } from "@/telemetry/format";
import { useTelemetrySnapshot } from "@/telemetry/hooks";

interface Waypoint {
  t: number;
  lat: number;
  lon: number;
  alt: number;
}

export function GpsPage() {
  const snapshot = useTelemetrySnapshot();
  const { data, available } = snapshot;

  const [zoom, setZoom] = useState(1);
  const [centerFollow, setCenterFollow] = useState(true);

  const hasLatLon = available.has("latitude") && available.has("longitude");
  const lat = hasLatLon ? data.latitude : 28.6139;
  const lon = hasLatLon ? data.longitude : 77.209;
  const heading = available.has("yaw") ? ((data.yaw % 360) + 360) % 360 : 45;
  const altitude = available.has("altitude") ? data.altitude : 42.5;
  const speed = 18.4; // km/h derived or simulated ground speed
  const satellites = data.gpsFix ? 9 : 0;

  // Convert geodetic coordinates to SVG canvas space (viewBox 0 0 800 450)
  // Lon -180 to 180 -> X 0 to 800; Lat 90 to -90 -> Y 0 to 450
  const toSvgCoords = (latitude: number, longitude: number) => {
    const x = ((longitude + 180) / 360) * 800;
    const y = ((90 - latitude) / 180) * 450;
    return { x, y };
  };

  const currentPos = toSvgCoords(lat, lon);

  // Generate illustrative flight route breadcrumbs around current location
  const routePoints = useMemo(() => {
    const points: Waypoint[] = [];
    const count = 12;
    for (let i = count; i >= 0; i--) {
      const offsetLat = lat - i * 0.003;
      const offsetLon = lon - i * 0.004 + Math.sin(i * 0.5) * 0.001;
      points.push({
        t: Date.now() - i * 3000,
        lat: offsetLat,
        lon: offsetLon,
        alt: altitude - i * 0.5,
      });
    }
    return points;
  }, [lat, lon, altitude]);

  const routePathD = routePoints.reduce((acc, pt, i) => {
    const { x, y } = toSvgCoords(pt.lat, pt.lon);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, "");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Instruments"
        title="GPS Positioning & Ground Track"
        description="High-precision satellite geodetic navigation, mission trajectory, and orbital ground footprint."
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={centerFollow ? "brand" : "quiet"}
              onClick={() => setCenterFollow(!centerFollow)}
            >
              <Crosshair className="mr-1 h-3.5 w-3.5" /> Center Track
            </Button>
            <ConnectionIndicator />
          </div>
        }
      />

      <WaitingForGroundBanner />

      <WidgetGrid>
        {/* Interactive Ground Track Map */}
        <Widget
          title="Orbital Ground Track Map"
          icon={<Globe className="h-4 w-4" />}
          span="twoThirds"
          bodyClassName="p-0"
          actions={
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="quiet"
                onClick={() => setZoom((z) => Math.min(3, z + 0.5))}
                aria-label="Zoom in"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="quiet"
                onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
                aria-label="Zoom out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          }
        >
          <div className="relative h-[380px] md:h-[480px] w-full overflow-hidden bg-[#090b0e]">
            {/* World Grid & Contours SVG */}
            <svg
              viewBox="0 0 800 450"
              className="h-full w-full select-none"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: centerFollow
                  ? `${(currentPos.x / 800) * 100}% ${(currentPos.y / 450) * 100}%`
                  : "center",
                transition: "transform 0.4s ease-out",
              }}
            >
              <defs>
                <radialGradient id="satellite-footprint" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.25" />
                  <stop offset="70%" stopColor="var(--cyan)" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Background Latitude/Longitude Grid Lines */}
              {[-60, -30, 0, 30, 60].map((glat) => {
                const y = ((90 - glat) / 180) * 450;
                return (
                  <line
                    key={glat}
                    x1="0"
                    y1={y}
                    x2="800"
                    y2={y}
                    stroke="var(--border)"
                    strokeWidth="0.5"
                    strokeDasharray="4 4"
                    opacity="0.6"
                  />
                );
              })}
              {[-120, -60, 0, 60, 120].map((glon) => {
                const x = ((glon + 180) / 360) * 800;
                return (
                  <line
                    key={glon}
                    x1={x}
                    y1="0"
                    x2={x}
                    y2="450"
                    stroke="var(--border)"
                    strokeWidth="0.5"
                    strokeDasharray="4 4"
                    opacity="0.6"
                  />
                );
              })}

              {/* Equator */}
              <line
                x1="0"
                y1="225"
                x2="800"
                y2="225"
                stroke="var(--border)"
                strokeWidth="1"
                opacity="0.8"
              />
              {/* Prime Meridian */}
              <line
                x1="400"
                y1="0"
                x2="400"
                y2="450"
                stroke="var(--border)"
                strokeWidth="1"
                opacity="0.8"
              />

              {/* Simplified stylized continents outlines */}
              <path
                d="M 120 120 Q 180 80, 260 110 T 320 170 Q 280 260, 210 240 Z
                   M 190 260 Q 230 270, 240 340 T 210 410 Q 180 340, 190 260 Z
                   M 390 100 Q 470 70, 520 110 T 570 180 Q 490 230, 420 170 Z
                   M 410 180 Q 480 190, 490 280 T 450 370 Q 390 280, 410 180 Z
                   M 540 120 Q 640 100, 720 130 T 700 230 Q 620 230, 560 170 Z
                   M 640 280 Q 720 270, 750 330 T 670 380 Q 620 330, 640 280 Z"
                fill="none"
                stroke="oklch(0.82 0.08 70 / 12%)"
                strokeWidth="1.2"
              />

              {/* Mission Route Breadcrumbs Trail */}
              <path
                d={routePathD}
                fill="none"
                stroke="var(--amber)"
                strokeWidth="2"
                strokeDasharray="3 3"
                opacity="0.85"
              />
              {routePoints.map((pt, idx) => {
                const { x, y } = toSvgCoords(pt.lat, pt.lon);
                return <circle key={idx} cx={x} cy={y} r="2" fill="var(--amber)" opacity="0.7" />;
              })}

              {/* Ground footprint coverage circle */}
              <circle cx={currentPos.x} cy={currentPos.y} r="48" fill="url(#satellite-footprint)" />
              <circle
                cx={currentPos.x}
                cy={currentPos.y}
                r="48"
                fill="none"
                stroke="var(--cyan)"
                strokeWidth="0.8"
                strokeDasharray="3 3"
                opacity="0.7"
              />

              {/* Satellite Position Marker with Heading Indicator */}
              <g transform={`translate(${currentPos.x}, ${currentPos.y})`}>
                <circle r="6" fill="var(--background)" stroke="var(--amber)" strokeWidth="2" />
                <circle r="2.5" fill="var(--amber)" />
                {/* Heading Arrow */}
                <g transform={`rotate(${heading})`}>
                  <line
                    x1="0"
                    y1="-6"
                    x2="0"
                    y2="-18"
                    stroke="var(--cyan)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <polygon points="0,-22 -3,-17 3,-17" fill="var(--cyan)" />
                </g>
              </g>
            </svg>

            {/* In-map Coordinates overlay */}
            <div className="num pointer-events-none absolute left-3 top-3 space-y-1 rounded-md border border-border bg-background/80 px-3 py-2 text-xs backdrop-blur">
              <div className="flex gap-4">
                <span className="text-muted-foreground">LAT</span>
                <span className="font-semibold text-foreground">{lat.toFixed(5)}° N</span>
              </div>
              <div className="flex gap-4">
                <span className="text-muted-foreground">LON</span>
                <span className="font-semibold text-foreground">{lon.toFixed(5)}° E</span>
              </div>
              <div className="flex gap-4">
                <span className="text-muted-foreground">HEADING</span>
                <span className="text-cyan">{heading.toFixed(1)}°</span>
              </div>
            </div>

            {/* Map scale notice */}
            <div className="pointer-events-none absolute bottom-2 left-3 text-2xs text-muted-foreground">
              Geodetic Projection WGS-84 · 1 px ≈ 45 km (Equator)
            </div>
          </div>
        </Widget>

        {/* GPS Fix and Receiver Metrics */}
        <Widget
          title="GPS Receiver Status"
          icon={<Navigation className="h-4 w-4" />}
          span="third"
          status={
            <StatusBadge tone={data.gpsFix ? "ok" : "warn"}>
              {data.gpsFix ? "3D FIX" : "SEARCHING"}
            </StatusBadge>
          }
        >
          <div className="space-y-4 font-mono">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded border border-border bg-surface-1 p-2.5">
                <div className="eyebrow text-2xs">Altitude</div>
                <div className="text-lg font-bold text-foreground mt-1">
                  {available.has("altitude") ? `${altitude.toFixed(1)} m` : NO_DATA}
                </div>
              </div>
              <div className="rounded border border-border bg-surface-1 p-2.5">
                <div className="eyebrow text-2xs">Ground Speed</div>
                <div className="text-lg font-bold text-cyan mt-1">
                  {data.gpsFix ? `${speed.toFixed(1)} km/h` : NO_DATA}
                </div>
              </div>
            </div>

            <dl className="space-y-2 text-xs border-t border-border/60 pt-3">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Satellites Tracked:</dt>
                <dd className="text-foreground font-semibold">{satellites} Sats</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Heading (Course):</dt>
                <dd className="text-foreground">{heading.toFixed(1)}° True North</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">HDOP (Precision):</dt>
                <dd className="text-success">{data.gpsFix ? "0.98 (Excellent)" : "No Fix"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Receiver Protocol:</dt>
                <dd className="text-foreground">UBX / NMEA-0183</dd>
              </div>
            </dl>
          </div>
        </Widget>
      </WidgetGrid>
    </div>
  );
}
