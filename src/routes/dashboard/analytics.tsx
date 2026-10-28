import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@/app/mission";
import { ModulePage } from "@/components/shell/ModulePage";

export const Route = createFileRoute("/dashboard/analytics")({
  head: () => ({ meta: [{ title: pageTitle("Analytics") }] }),
  component: () => <ModulePage section="analytics" />,
});
