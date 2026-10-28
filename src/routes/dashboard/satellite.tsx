import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@/app/mission";
import { ModulePage } from "@/components/shell/ModulePage";

export const Route = createFileRoute("/dashboard/satellite")({
  head: () => ({ meta: [{ title: pageTitle("Satellite") }] }),
  component: () => <ModulePage section="satellite" />,
});
