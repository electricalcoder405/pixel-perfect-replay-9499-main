import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@/app/mission";
import { SatellitePage } from "@/components/satellite/SatellitePage";

export const Route = createFileRoute("/dashboard/satellite")({
  head: () => ({ meta: [{ title: pageTitle("Satellite") }] }),
  component: SatellitePage,
});
