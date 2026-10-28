import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@/app/mission";
import { ModulePage } from "@/components/shell/ModulePage";

export const Route = createFileRoute("/dashboard/logs")({
  head: () => ({ meta: [{ title: pageTitle("Mission Logs") }] }),
  component: () => <ModulePage section="logs" />,
});
