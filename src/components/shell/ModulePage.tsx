import { Cog } from "lucide-react";
import { findNavItem, type NavIconName } from "@/app/navigation";
import { ConnectionIndicator, PageHeader, Widget, WidgetGrid } from "@/components/ds";

/** Standard page for a dashboard module that is not released yet. Replaced section by section. */
export function ModulePage({ section }: { section: NavIconName }) {
  const item = findNavItem(section);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Module" title={item.label} description={item.description} />
      <WidgetGrid>
        <Widget
          title="Data feed"
          icon={<Cog className="h-4 w-4" />}
          status={<ConnectionIndicator />}
          state="empty"
          empty={{ title: `${item.label} is under development`, description: "It will show live data from the active telemetry source as soon as it is released." }}
        />
      </WidgetGrid>
    </div>
  );
}
