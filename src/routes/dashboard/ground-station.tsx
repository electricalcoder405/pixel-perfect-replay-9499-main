import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@/app/mission";
import { ModulePage } from "@/components/shell/ModulePage";

export const Route = createFileRoute("/dashboard/ground-station")({
  head: () => ({ meta: [{ title: pageTitle("Ground Station") }] }),
  component: () => <ModulePage section="ground-station" />,
});
