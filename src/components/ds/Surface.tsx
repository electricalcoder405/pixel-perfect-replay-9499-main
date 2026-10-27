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
  /** Adds a hover glow for surfaces that behave like controls. */
  interactive?: boolean;
}

/** The base container for panels and cards. */
export function Surface({ as: Tag = "div", variant = "glass", padding = "md", interactive = false, className, ...props }: SurfaceProps) {
  return (
    <Tag
      className={cn("relative", variantClass[variant], paddingClass[padding], interactive && "transition-shadow duration-300 hover:shadow-glow-cyan", className)}
      {...props}
    />
  );
}
