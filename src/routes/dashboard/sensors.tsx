import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@/app/mission";
import { ModulePage } from "@/components/shell/ModulePage";

export const Route = createFileRoute("/dashboard/sensors")({
  head: () => ({ meta: [{ title: pageTitle("Sensors") }] }),
  component: () => <ModulePage section="sensors" />,
});
