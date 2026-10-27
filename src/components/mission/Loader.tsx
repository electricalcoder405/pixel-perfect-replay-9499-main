import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const STEPS = ["Initializing Satellite...", "Loading Sensors...", "Connecting Telemetry...", "Preparing Dashboard..."];

export function Loader({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i >= STEPS.length) { const t = setTimeout(onDone, 400); return () => clearTimeout(t); }
    const t = setTimeout(() => setI(i + 1), 650);
    return () => clearTimeout(t);
  }, [i, onDone]);
  return (
    <motion.div exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.6 }} className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <div className="relative mb-8 h-28 w-28">
        <div className="absolute inset-0 rounded-full border-2 border-cyan/20 border-t-cyan" style={{ animation: "spin-slow 1.2s linear infinite" }} />
        <div className="absolute inset-3 rounded-full border-2 border-amber/20 border-b-amber" style={{ animation: "spin-slow 2s linear infinite reverse" }} />
      </div>
      <motion.h1 initial={{ opacity: 0, letterSpacing: "0.8em" }} animate={{ opacity: 1, letterSpacing: "0.3em" }} transition={{ duration: 1 }}
        className="font-display text-5xl font-bold text-amber glow-amber">OLD MONK</motion.h1>
      <p className="mt-2 font-mono text-xs uppercase tracking-[0.5em] text-cyan glow-cyan">Mission Control</p>
      <div className="mt-8 h-24 w-72 space-y-1 font-mono text-xs">
        {STEPS.slice(0, i + 1).map((s, k) => (
          <motion.div key={s} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className={k < i ? "text-success" : "text-foreground"}>
            {k < i ? "✓" : "›"} {s}
          </motion.div>
        ))}
      </div>
      <div className="h-1 w-72 overflow-hidden rounded-full bg-muted">
        <motion.div className="h-full bg-gradient-to-r from-amber to-cyan" animate={{ width: `${(i / STEPS.length) * 100}%` }} />
      </div>
    </motion.div>
  );
}
