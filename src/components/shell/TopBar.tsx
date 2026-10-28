import { useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { findNavItemByPath } from "@/app/navigation";
import { ConnectionIndicator } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { MissionTimer } from "./MissionTimer";
import { WorldClocks } from "./WorldClocks";

/**
 * Sticky top bar: location, clocks, mission timer and link state.
 * Clocks appear from md upwards, the mission timer from sm and the source label from xl,
 * so the bar never overflows on phones.
 */
export function TopBar({ onOpenNav }: { onOpenNav: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const section = findNavItemByPath(pathname);

  return (
    <header className="border-b border-border">
      <div className="flex h-14 items-center gap-3 px-4 md:px-6">
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation menu" onClick={onOpenNav}>
          <Menu />
        </Button>

        <p className="min-w-0 flex-1 truncate font-display text-sm text-muted-foreground">
          <span className="max-sm:sr-only">Mission Control / </span>
          <span className="font-medium text-foreground">{section?.label ?? "Dashboard"}</span>
        </p>

        <div className="flex items-center gap-5">
          <div className="hidden md:block">
            <WorldClocks />
          </div>
          <div className="hidden sm:block">
            <MissionTimer />
          </div>
          <ConnectionIndicator sourceClassName="hidden xl:inline" />
        </div>
      </div>
    </header>
  );
}
