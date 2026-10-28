/** Mission identity and schedule. Edit this file to change branding text across the app. */
export const mission = {
  name: "ORBITRA'26",
  title: "Old Monk Mission Control",
  tagline: "Realtime Aerospace Telemetry Platform",
  description:
    "Live telemetry, attitude, GPS and link diagnostics from the ORBITRA'26 CubeSat, received over ESP-NOW and presented in one mission-control console.",
  /**
   * Launch or mission-start time. Leave null until a schedule is announced;
   * the countdown then shows "Awaiting mission schedule". Set a Date to enable it.
   */
  launchAt: null as Date | null,
} as const;

export function pageTitle(label: string): string {
  return `${label} · ${mission.name} Mission Control`;
}
