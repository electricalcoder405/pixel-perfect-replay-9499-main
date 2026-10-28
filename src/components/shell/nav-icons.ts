import {
  Activity,
  History,
  LayoutDashboard,
  LineChart,
  MapPin,
  RadioTower,
  Satellite,
  ScrollText,
  Settings,
  Stethoscope,
  Cpu,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import type { NavIconName } from "@/app/navigation";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/** One icon per navigation section. The Record type makes a missing icon a compile error. */
export const NAV_ICONS: Record<NavIconName, IconComponent> = {
  overview: LayoutDashboard,
  telemetry: Activity,
  satellite: Satellite,
  "ground-station": RadioTower,
  sensors: Cpu,
  gps: MapPin,
  logs: ScrollText,
  diagnostics: Stethoscope,
  analytics: LineChart,
  history: History,
  settings: Settings,
};
