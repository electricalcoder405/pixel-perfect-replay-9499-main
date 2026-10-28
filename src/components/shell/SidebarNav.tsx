import { Link } from "@tanstack/react-router";
import { NAV_GROUPS } from "@/app/navigation";
import { mission } from "@/app/mission";
import { BrandMark } from "@/components/ds";
import { cn } from "@/lib/utils";
import { NAV_ICONS } from "./nav-icons";

/**
 * Primary navigation.
 * `compact` is the desktop sidebar, which collapses to an icon rail below the lg breakpoint.
 * The drawer on phones passes `compact={false}` so labels are always visible.
 * Hidden labels use `max-lg:sr-only`, never `display: none`, so every link keeps its accessible name.
 */
export function SidebarNav({ compact, onNavigate }: { compact: boolean; onNavigate?: () => void }) {
  const label = compact ? "max-lg:sr-only" : "";
  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center gap-3 px-4 py-5", compact && "max-lg:justify-center max-lg:px-0")}>
        <BrandMark label={mission.name} className="h-9 w-9" />
        <div className={cn("min-w-0", label)}>
          <p className="font-display text-base font-semibold leading-tight tracking-wide text-foreground">{mission.name}</p>
          <p className="eyebrow text-copper">Mission Control</p>
        </div>
      </div>

      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mt-4 first:mt-0">
            <p className={cn("eyebrow px-3 pb-1.5", label)}>{group.label}</p>
            {compact && <div aria-hidden="true" className="mx-3 mb-2 hidden h-px bg-border max-lg:block" />}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = NAV_ICONS[item.id];
                return (
                  <li key={item.id}>
                    <Link
                      to={item.to}
                      activeOptions={{ exact: true }}
                      title={item.label}
                      {...(onNavigate ? { onClick: onNavigate } : {})}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors",
                        "hover:bg-surface-2 hover:text-foreground",
                        "data-[status=active]:bg-amber/10 data-[status=active]:text-amber",
                        "before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-amber before:opacity-0 data-[status=active]:before:opacity-100",
                        compact && "max-lg:justify-center max-lg:px-0",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className={label}>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
