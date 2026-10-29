import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type SurfaceVariant = "glass" | "solid" | "inset";
type SurfacePadding = "none" | "sm" | "md" | "lg";

const variantClass: Record<SurfaceVariant, string> = {
  glass: "glass",
  solid: "surface-solid",
  inset: "surface-inset",
};
const paddingClass: Record<SurfacePadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export interface SurfaceProps extends ComponentPropsWithoutRef<"div"> {
  as?: "div" | "section" | "article";
  variant?: SurfaceVariant;
  padding?: SurfacePadding;
  /** Adds a subtle hover state for surfaces that behave like controls. */
  interactive?: boolean;
}

/** The base container for panels and cards with aerospace depth and borders. */
export function Surface({
  as: Tag = "div",
  variant = "glass",
  padding = "md",
  interactive = false,
  className,
  ...props
}: SurfaceProps) {
  return (
    <Tag
      className={cn(
        "relative",
        variantClass[variant],
        paddingClass[padding],
        interactive &&
          "transition-all duration-200 hover:border-amber/35 hover:bg-surface-2/40 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.65)] cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}
