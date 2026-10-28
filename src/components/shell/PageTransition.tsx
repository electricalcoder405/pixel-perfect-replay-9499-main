import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeUp } from "@/design/motion";

/**
 * Fades page content in when a route mounts. Key it by pathname so each navigation replays it.
 * Reduced-motion users get no movement (see <MotionConfig> in the root route).
 */
export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div {...fadeUp()} {...(className ? { className } : {})}>
      {children}
    </motion.div>
  );
}
