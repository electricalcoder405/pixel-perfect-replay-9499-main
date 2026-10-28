import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@/app/mission";
import { LogsPage } from "@/components/logs/LogsPage";

export const Route = createFileRoute("/dashboard/logs")({
  head: () => ({ meta: [{ title: pageTitle("Mission Logs") }] }),
  component: LogsPage,
});
