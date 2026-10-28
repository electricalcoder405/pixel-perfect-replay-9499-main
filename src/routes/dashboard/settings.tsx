import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@/app/mission";
import { ModulePage } from "@/components/shell/ModulePage";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: pageTitle("Settings") }] }),
  component: () => <ModulePage section="settings" />,
});
