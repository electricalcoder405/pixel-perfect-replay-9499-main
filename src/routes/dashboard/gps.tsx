import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@/app/mission";
import { GpsPage } from "@/components/gps/GpsPage";

export const Route = createFileRoute("/dashboard/gps")({
  head: () => ({ meta: [{ title: pageTitle("GPS") }] }),
  component: GpsPage,
});
