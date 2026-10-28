import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@/app/mission";
import { TelemetryChannelPage } from "@/components/telemetry/TelemetryChannelPage";

export const Route = createFileRoute("/dashboard/telemetry")({
  head: () => ({ meta: [{ title: pageTitle("Telemetry") }] }),
  component: TelemetryChannelPage,
});
