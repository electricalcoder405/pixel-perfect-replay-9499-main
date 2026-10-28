/**
 * Motion tokens. Animations in this app must communicate something (state change,
 * hierarchy, live data) and stay short. `<MotionConfig reducedMotion="user">` in the
 * root route disables transform animation for users who ask for reduced motion.
 */
export const duration = { fast: 0.2, base: 0.35, slow: 0.6 } as const;

export const easeOut = [0.16, 1, 0.3, 1] as const;

/** Standard entrance: fade in while rising slightly. `delay` staggers siblings. */
export function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: duration.base, ease: easeOut, delay },
  } as const;
}
