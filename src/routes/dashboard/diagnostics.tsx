import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@/app/mission";
import { DiagnosticsPage } from "@/components/diagnostics/DiagnosticsPage";

export const Route = createFileRoute("/dashboard/diagnostics")({
  head: () => ({ meta: [{ title: pageTitle("Diagnostics") }] }),
  component: DiagnosticsPage,
});
