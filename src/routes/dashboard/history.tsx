import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@/app/mission";
import { ModulePage } from "@/components/shell/ModulePage";

export const Route = createFileRoute("/dashboard/history")({
  head: () => ({ meta: [{ title: pageTitle("History") }] }),
  component: () => <ModulePage section="history" />,
});
