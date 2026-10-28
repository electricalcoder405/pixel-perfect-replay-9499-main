import { useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { findNavItemByPath } from "@/app/navigation";
import { ConnectionIndicator } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { useTelemetryMode } from "@/telemetry/config";
import { cn } from "@/lib/utils";
import { MissionTimer } from "./MissionTimer";
import { WorldClocks } from "./WorldClocks";

/**
 * Sticky top bar: location, Mission Source selector (Demo vs Ground Controller),
 * clocks, mission timer, and link state.
 */
export function TopBar({ onOpenNav }: { onOpenNav: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const section = findNavItemByPath(pathname);
  const { isDemo, isGroundController, setMode } = useTelemetryMode();

  return (
    <header className="border-b border-border bg-surface-0/80 backdrop-blur-md">
      <div className="flex h-14 items-center gap-3 px-4 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open navigation menu"
          onClick={onOpenNav}
        >
          <Menu />
        </Button>

        <p className="min-w-0 flex-1 truncate font-display text-sm text-muted-foreground">
          <span className="max-sm:sr-only">Mission Control / </span>
          <span className="font-medium text-foreground">{section?.label ?? "Dashboard"}</span>
        </p>

        {/* Mission Source Selector: Demo vs Ground Controller */}
        <div
          className="flex items-center gap-1 rounded-md border border-border bg-surface-1/90 p-0.5 font-mono text-2xs shadow-xs"
          role="radiogroup"
          aria-label="Mission Telemetry Source"
        >
          <span className="hidden lg:inline px-1.5 text-muted-foreground eyebrow text-[9px] tracking-wider">
            Source
          </span>
          <button
            type="button"
            role="radio"
            aria-checked={isDemo}
            onClick={() => setMode("demo")}
            className={cn(
              "flex items-center gap-1.5 rounded px-2.5 py-1 text-2xs transition-all",
              isDemo
                ? "bg-amber text-black font-semibold shadow-xs"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
            )}
            title="Demo Mode: Uses internal telemetry simulator. No hardware required."
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isDemo ? "bg-black" : "bg-muted-foreground/60",
              )}
            />
            Demo
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={isGroundController}
            onClick={() => setMode("ground-controller")}
            className={cn(
              "flex items-center gap-1.5 rounded px-2.5 py-1 text-2xs transition-all",
              isGroundController
                ? "bg-cyan text-black font-semibold shadow-xs"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
            )}
            title="Ground Controller Mode: Live telemetry from ESP8266 receiver via bridge.js"
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isGroundController ? "bg-black animate-pulse" : "bg-muted-foreground/60",
              )}
            />
            Ground Controller
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden xl:block">
            <WorldClocks />
          </div>
          <div className="hidden sm:block">
            <MissionTimer />
          </div>
          <ConnectionIndicator sourceClassName="hidden 2xl:inline" />
        </div>
      </div>
    </header>
  );
}
