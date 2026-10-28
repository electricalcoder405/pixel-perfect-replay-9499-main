import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@/app/mission";
import { ModulePage } from "@/components/shell/ModulePage";

export const Route = createFileRoute("/dashboard/telemetry")({
  head: () => ({ meta: [{ title: pageTitle("Telemetry") }] }),
  component: () => <ModulePage section="telemetry" />,
});
