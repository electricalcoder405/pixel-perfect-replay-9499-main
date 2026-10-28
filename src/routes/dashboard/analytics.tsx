import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@/app/mission";
import { AnalyticsPage } from "@/components/analytics/AnalyticsPage";

export const Route = createFileRoute("/dashboard/analytics")({
  head: () => ({ meta: [{ title: pageTitle("Analytics") }] }),
  component: AnalyticsPage,
});
