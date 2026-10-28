import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@/app/mission";
import { HistoryPage } from "@/components/history/HistoryPage";

export const Route = createFileRoute("/dashboard/history")({
  head: () => ({ meta: [{ title: pageTitle("History") }] }),
  component: HistoryPage,
});
