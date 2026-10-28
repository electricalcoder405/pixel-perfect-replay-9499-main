/**
 * Single source of truth for dashboard navigation.
 * The sidebar, top bar, page titles and placeholder pages all read from here.
 * Adding a section means adding one entry here and one file in `src/routes/dashboard/`.
 */
export type NavIconName =
  | "overview"
  | "telemetry"
  | "satellite"
  | "ground-station"
  | "sensors"
  | "gps"
  | "logs"
  | "diagnostics"
  | "analytics"
  | "history"
  | "settings";

export type NavPath =
  | "/dashboard"
  | "/dashboard/telemetry"
  | "/dashboard/satellite"
  | "/dashboard/ground-station"
  | "/dashboard/sensors"
  | "/dashboard/gps"
  | "/dashboard/logs"
  | "/dashboard/diagnostics"
  | "/dashboard/analytics"
  | "/dashboard/history"
  | "/dashboard/settings";

export interface NavItem {
  readonly id: NavIconName;
  readonly label: string;
  readonly to: NavPath;
  readonly description: string;
}

export interface NavGroup {
  readonly label: string;
  readonly items: readonly NavItem[];
}

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: "Operations",
    items: [
      {
        id: "overview",
        label: "Mission Overview",
        to: "/dashboard",
        description: "Live attitude, power, sensors and link status at a glance.",
      },
      {
        id: "telemetry",
        label: "Telemetry",
        to: "/dashboard/telemetry",
        description: "Every telemetry channel with live values, trends and update times.",
      },
      {
        id: "satellite",
        label: "Satellite",
        to: "/dashboard/satellite",
        description: "3D attitude visualisation with orbit and Earth context.",
      },
      {
        id: "ground-station",
        label: "Ground Station",
        to: "/dashboard/ground-station",
        description: "Receiver, radio link and ground-segment status.",
      },
    ],
  },
  {
    label: "Instruments",
    items: [
      {
        id: "sensors",
        label: "Sensors",
        to: "/dashboard/sensors",
        description: "Health and readings for the DHT11, BMP280, MPU6050 and GPS.",
      },
      {
        id: "gps",
        label: "GPS",
        to: "/dashboard/gps",
        description: "Position, heading and route history with fix status.",
      },
    ],
  },
  {
    label: "Data",
    items: [
      {
        id: "logs",
        label: "Mission Logs",
        to: "/dashboard/logs",
        description: "Timestamped events, link changes and packet notices.",
      },
      {
        id: "diagnostics",
        label: "Diagnostics",
        to: "/dashboard/diagnostics",
        description: "Packet loss, packet rate, signal and receiver health.",
      },
      {
        id: "analytics",
        label: "Analytics",
        to: "/dashboard/analytics",
        description: "Interactive charts with zoom, pan and crosshair across every channel.",
      },
      {
        id: "history",
        label: "History",
        to: "/dashboard/history",
        description: "Browse and export recorded telemetry.",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        id: "settings",
        label: "Settings",
        to: "/dashboard/settings",
        description: "Data source, units and display preferences.",
      },
    ],
  },
];

export const NAV_ITEMS: readonly NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function findNavItem(id: NavIconName): NavItem {
  const item = NAV_ITEMS.find((i) => i.id === id);
  if (!item) throw new Error(`Unknown navigation item: ${id}`);
  return item;
}

/** Finds the section for a pathname; "/dashboard/gps/" and "/dashboard/gps" both match. */
export function findNavItemByPath(pathname: string): NavItem | undefined {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return NAV_ITEMS.find((i) => i.to === clean);
}
