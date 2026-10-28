import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@/app/mission";
import { ModulePage } from "@/components/shell/ModulePage";

export const Route = createFileRoute("/dashboard/diagnostics")({
  head: () => ({ meta: [{ title: pageTitle("Diagnostics") }] }),
  component: () => <ModulePage section="diagnostics" />,
});
