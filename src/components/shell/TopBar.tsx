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
 * clocks, mission timer, and link state with refined aerospace typography.
 */
export function TopBar({ onOpenNav }: { onOpenNav: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const section = findNavItemByPath(pathname);
  const { isDemo, isGroundController, setMode } = useTelemetryMode();

  return (
    <header className="border-b border-border/70 bg-surface-0/85 backdrop-blur-md sticky top-0 z-30">
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

        <p className="min-w-0 flex-1 truncate font-display text-xs md:text-sm text-muted-foreground tracking-tight">
          <span className="max-sm:sr-only font-normal opacity-70">Mission Control / </span>
          <span className="font-semibold text-foreground">{section?.label ?? "Dashboard"}</span>
        </p>

        {/* Mission Source Selector: Demo vs Ground Controller */}
        <div
          className="flex items-center gap-1 rounded-md border border-border/80 bg-surface-1/90 p-0.5 font-mono text-2xs shadow-xs"
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
              "flex items-center gap-1.5 rounded px-2.5 py-1 text-2xs transition-all cursor-pointer",
              isDemo
                ? "bg-amber text-white font-bold shadow-xs"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground font-medium",
            )}
            title="Demo Mode: Uses internal telemetry simulator. No hardware required."
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isDemo ? "bg-white" : "bg-muted-foreground/60",
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
              "flex items-center gap-1.5 rounded px-2.5 py-1 text-2xs transition-all cursor-pointer",
              isGroundController
                ? "bg-cyan text-white font-bold shadow-xs"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground font-medium",
            )}
            title="Ground Controller Mode: Live telemetry from ESP8266 receiver via bridge.js"
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isGroundController ? "bg-white animate-pulse" : "bg-muted-foreground/60",
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
