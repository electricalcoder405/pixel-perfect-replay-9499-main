import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

/** Small uppercase label used above values and section titles. */
export function Eyebrow({ className, ...props }: ComponentPropsWithoutRef<"span">) {
  return <span className={cn("eyebrow", className)} {...props} />;
}
