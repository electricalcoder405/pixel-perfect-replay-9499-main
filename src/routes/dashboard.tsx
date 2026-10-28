import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/shell/DashboardLayout";

/** Layout route for everything under /dashboard: boot sequence, shell and navigation. */
export const Route = createFileRoute("/dashboard")({
  ssr: false,
  component: DashboardLayout,
});
