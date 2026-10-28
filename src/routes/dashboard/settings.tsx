import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "@/app/mission";
import { SettingsPage } from "@/components/settings/SettingsPage";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: pageTitle("Settings") }] }),
  component: SettingsPage,
});
