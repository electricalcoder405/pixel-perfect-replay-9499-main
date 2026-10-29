import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@/app/mission";
import { ConnectionGuidePage } from "@/components/guide/ConnectionGuidePage";

export const Route = createFileRoute("/dashboard/guide")({
  head: () => ({ meta: [{ title: pageTitle("Connection Guide") }] }),
  component: ConnectionGuidePage,
});

