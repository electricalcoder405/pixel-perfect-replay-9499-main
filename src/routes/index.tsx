import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing/LandingPage";
import { mission } from "@/app/mission";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: `${mission.title} · ${mission.name}` },
      { name: "description", content: mission.description },
      { property: "og:title", content: `${mission.title} · ${mission.name}` },
      { property: "og:description", content: mission.tagline },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});
