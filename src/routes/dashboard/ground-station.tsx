import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@/app/mission";
import { GroundStationPage } from "@/components/groundstation/GroundStationPage";

export const Route = createFileRoute("/dashboard/ground-station")({
  head: () => ({ meta: [{ title: pageTitle("Ground Station") }] }),
  component: GroundStationPage,
});
