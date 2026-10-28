/**
 * Global application background layer.
 *
 * Requirements:
 * - position: fixed
 * - inset: 0
 * - z-index: -1
 * - background-image: url('/dashboard-bg.png')
 * - background-size: cover
 * - background-position: center
 * - background-repeat: no-repeat
 * - background-attachment: fixed
 * - Dark overlay (60-80% opacity) above the image so the UI remains readable
 * - Faded presence (the Old Monk bottle & satellite are discovered after looking closely)
 * - Subtle military vignette, slight warm amber glow, soft smoke blending, and fine grain
 * - High performance, pointer-events-none, will-change: transform
 */
export function BackgroundLayer() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 select-none overflow-hidden"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
      }}
    >
      {/* 1. Base dark background layer */}
      <div className="absolute inset-0 bg-[#07090e]" />

      {/* 2. Global Old Monk / ORBITRA mission texture */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
        style={{
          backgroundImage: "url('/dashboard-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
        }}
      />

      {/* 3. Dark transparent overlay (70% opacity) so all dashboard cards, charts, and text remain 100% readable */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "rgba(7, 9, 14, 0.70)",
        }}
      />

      {/* 4. Subtle military console vignette (darkens viewport perimeter) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(6, 8, 12, 0.45) 70%, rgba(4, 5, 8, 0.88) 100%)",
        }}
      />

      {/* 5. Slight warm amber glow around the constellation and bottle emblem */}
      <div
        className="absolute -left-16 top-6 h-[46rem] w-[46rem] rounded-full opacity-25 blur-[140px]"
        style={{
          background: "radial-gradient(circle, rgba(233, 162, 59, 0.22) 0%, transparent 70%)",
        }}
      />

      {/* 6. Very light radial lighting & soft smoke blending */}
      <div
        className="absolute inset-0 opacity-35 mix-blend-screen"
        style={{
          background:
            "radial-gradient(ellipse 65% 50% at 20% 30%, rgba(184, 106, 46, 0.14) 0%, transparent 65%), radial-gradient(ellipse 55% 55% at 75% 65%, rgba(95, 214, 232, 0.05) 0%, transparent 60%)",
        }}
      />

      {/* 7. Very subtle aerospace grain / noise texture */}
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
