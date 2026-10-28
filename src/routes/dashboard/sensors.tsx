import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@/app/mission";
import { SensorsPage } from "@/components/sensors/SensorsPage";

export const Route = createFileRoute("/dashboard/sensors")({
  head: () => ({ meta: [{ title: pageTitle("Sensors") }] }),
  component: SensorsPage,
});
