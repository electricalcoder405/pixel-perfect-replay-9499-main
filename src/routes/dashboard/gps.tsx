import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@/app/mission";
import { ModulePage } from "@/components/shell/ModulePage";

export const Route = createFileRoute("/dashboard/gps")({
  head: () => ({ meta: [{ title: pageTitle("GPS") }] }),
  component: () => <ModulePage section="gps" />,
});
