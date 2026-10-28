import { useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { mission } from "@/app/mission";
import { SkipLink } from "@/components/ds";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { MissionStatusBar } from "./MissionStatusBar";
import { PageTransition } from "./PageTransition";
import { SidebarNav } from "./SidebarNav";
import { TopBar } from "./TopBar";

/**
 * Dashboard frame: skip link, sidebar (icon rail on tablets, full on desktop), a sticky
 * header with the top bar and mission status strip, a drawer for phones, and the <main>
 * landmark that routes render into.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[4rem_minmax(0,1fr)] lg:grid-cols-[16rem_minmax(0,1fr)]">
      <SkipLink />

      <aside className="sticky top-0 hidden h-dvh border-r border-border bg-surface-0/80 backdrop-blur-md md:block">
        <SidebarNav compact />
      </aside>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-72 border-border bg-surface-0 p-0 sm:max-w-xs">
          <SheetTitle className="sr-only">{mission.name} navigation</SheetTitle>
          <SheetDescription className="sr-only">Choose a dashboard section.</SheetDescription>
          <SidebarNav compact={false} onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="min-w-0">
        <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-md">
          <TopBar onOpenNav={() => setDrawerOpen(true)} />
          <MissionStatusBar />
        </div>
        <main id="main" tabIndex={-1} className="page-container py-4 outline-none md:py-6">
          <PageTransition key={pathname}>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
