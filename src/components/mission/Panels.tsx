import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Area, AreaChart, Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { BatteryCharging, Satellite, Zap, Terminal } from "lucide-react";
import type { HistoryPoint, Telemetry } from "@/lib/telemetry";

export function Panel({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass relative overflow-hidden p-4 ${className}`}
    >
      <header className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
        <span className="text-cyan">{icon}</span>
        {title}
        <span className="ml-auto h-px flex-1 bg-gradient-to-r from-border to-transparent" />
      </header>
      {children}
    </motion.section>
  );
}

type Tone = "ok" | "warn" | "crit" | "info";
const toneCls: Record<Tone, string> = {
  ok: "text-success",
  warn: "text-warning",
  crit: "text-critical",
  info: "text-cyan",
};

export function StatCard({
  label,
  value,
  unit,
  icon,
  status,
  tone = "ok",
  spark,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: ReactNode;
  status: string;
  tone?: Tone;
  spark?: number;
}) {
  return (
    <div className="glass group relative overflow-hidden p-3 transition-all duration-200 hover:border-amber/30">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="font-mono text-[10px] uppercase tracking-widest">{label}</span>
        <span className="text-amber">{icon}</span>
      </div>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={value}
          initial={{ opacity: 0.4, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground"
        >
          {value}
          <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
        </motion.div>
      </AnimatePresence>
      <div
        className={`mt-1 flex items-center gap-1.5 font-mono text-[10px] uppercase ${toneCls[tone]}`}
      >
        <span className="led" />
        {status}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-muted">
        <motion.div
          className="h-full bg-gradient-to-r from-amber to-copper"
          animate={{ width: `${Math.max(4, Math.min(100, spark ?? 50))}%` }}
          transition={{ duration: 0.8 }}
        />
      </div>
    </div>
  );
}

export function Horizon({ roll, pitch }: { roll: number; pitch: number }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-full border border-cyan/40 bg-background/50 shadow-md">
      <motion.div
        className="absolute inset-[-50%]"
        animate={{ rotate: -roll, y: pitch * 2 }}
        transition={{ type: "spring", stiffness: 60, damping: 14 }}
      >
        <div className="h-1/2 bg-gradient-to-b from-cyan/15 to-cyan/35" />
        <div className="h-1/2 border-t-2 border-foreground bg-gradient-to-b from-amber/40 to-amber/10" />
        {[-20, -10, 10, 20].map((p) => (
          <div
            key={p}
            className="absolute left-1/2 h-px -translate-x-1/2 bg-foreground/70"
            style={{ top: `calc(50% - ${p * 2}px)`, width: Math.abs(p) === 10 ? 40 : 70 }}
          />
        ))}
      </motion.div>
      <svg viewBox="0 0 100 100" className="absolute inset-0 text-amber">
        <path
          d="M22 50 H42 L46 55 M78 50 H58 L54 55"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
        />
        <circle cx="50" cy="50" r="2" fill="currentColor" />
      </svg>
    </div>
  );
}

export function Dial({ label, value, max = 180 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(1, Math.abs(value) / max);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-16 w-16">
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--muted)" strokeWidth="6" />
          <motion.circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="var(--cyan)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={264}
            animate={{ strokeDashoffset: 264 * (1 - pct) }}
            transition={{ duration: 0.8 }}
          />
        </svg>
        <motion.div
          className="absolute inset-0 flex items-start justify-center"
          animate={{ rotate: value }}
          transition={{ type: "spring", stiffness: 50 }}
        >
          <span className="mt-1.5 h-0 w-0 border-x-4 border-b-[8px] border-x-transparent border-b-amber" />
        </motion.div>
        <div className="absolute inset-0 flex items-center justify-center font-mono text-xs tabular-nums">
          {value.toFixed(0)}°
        </div>
      </div>
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function Vector({
  label,
  x,
  y,
  z,
  unit,
  scale,
}: {
  label: string;
  x: number;
  y: number;
  z: number;
  unit: string;
  scale: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      {(
        [
          ["X", x],
          ["Y", y],
          ["Z", z],
        ] as const
      ).map(([k, v]) => (
        <div key={k} className="flex items-center gap-2 font-mono text-xs">
          <span className="w-3 text-amber">{k}</span>
          <div className="relative h-1.5 flex-1 rounded-full bg-muted">
            <div className="absolute left-1/2 top-0 h-full w-px bg-foreground/40" />
            <motion.div
              className="absolute top-0 h-full rounded-full bg-cyan"
              animate={{
                left: v >= 0 ? "50%" : `${50 - Math.min(50, (Math.abs(v) / scale) * 50)}%`,
                width: `${Math.min(50, (Math.abs(v) / scale) * 50)}%`,
              }}
              transition={{ duration: 0.6 }}
            />
          </div>
          <span className="w-16 text-right tabular-nums">
            {v.toFixed(2)}
            <span className="text-muted-foreground"> {unit}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function Earth({ d }: { d: Telemetry }) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-28 w-28 shrink-0">
        <div
          className="absolute inset-0 overflow-hidden rounded-full border border-cyan/20 shadow-inner"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--cyan) 25%, transparent), transparent 60%), repeating-linear-gradient(90deg, color-mix(in oklab, var(--cyan) 30%, transparent) 0 1px, transparent 1px 14px), repeating-linear-gradient(0deg, color-mix(in oklab, var(--cyan) 25%, transparent) 0 1px, transparent 1px 14px)",
            backgroundSize: "100% 100%, 200% 100%, 100% 100%",
            animation: "earth-scroll 18s linear infinite",
            backgroundColor: "oklch(0.2 0.05 240)",
          }}
        />
        <div
          className="absolute -inset-3 rounded-full border border-dashed border-amber/30"
          style={{ animation: "spin-slow 12s linear infinite" }}
        >
          <Satellite className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 text-amber" />
        </div>
        <span className="absolute left-[62%] top-[38%] h-2 w-2 rounded-full bg-success ring-2 ring-success/30" />
      </div>
      <div className="space-y-1 font-mono text-xs">
        <div>
          <span className="text-muted-foreground">LAT </span>
          <span className="tabular-nums">{d.latitude.toFixed(5)}°N</span>
        </div>
        <div>
          <span className="text-muted-foreground">LON </span>
          <span className="tabular-nums">{d.longitude.toFixed(5)}°E</span>
        </div>
        <div className={`flex items-center gap-1.5 ${d.gpsFix ? "text-success" : "text-warning"}`}>
          <span className="led" />
          {d.gpsFix ? "3D FIX · 9 SATS" : "ACQUIRING…"}
        </div>
        <div className="flex items-center gap-1.5 text-cyan">
          <span className="led" />
          LINK ACTIVE
        </div>
      </div>
    </div>
  );
}

export function Battery({ pct, charging }: { pct: number; charging: boolean }) {
  const tone = pct > 50 ? "bg-success" : pct > 20 ? "bg-warning" : "bg-critical";
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-14 w-28 rounded-md border border-border bg-surface-1 p-1">
        <div className="absolute -right-2 top-1/2 h-5 w-1.5 -translate-y-1/2 rounded-r bg-border" />
        <motion.div
          className={`relative h-full overflow-hidden rounded-sm ${tone}`}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8 }}
        >
          {charging && (
            <motion.div
              className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-foreground/30 to-transparent"
              animate={{ x: ["-2rem", "8rem"] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
            />
          )}
        </motion.div>
        {charging && <Zap className="absolute inset-0 m-auto h-5 w-5 fill-amber text-amber" />}
      </div>
      <div className="font-mono">
        <div className="text-3xl font-semibold tabular-nums">
          {pct.toFixed(0)}
          <span className="text-sm text-muted-foreground">%</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] uppercase text-success">
          <BatteryCharging className="h-3 w-3" />
          {charging ? "Charging · Solar" : "Discharging · Stable"}
        </div>
      </div>
    </div>
  );
}

export function StatusList({ items }: { items: { label: string; ok: boolean; text: string }[] }) {
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li
          key={i.label}
          className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-1.5 font-mono text-xs"
        >
          <span className="text-muted-foreground">{i.label}</span>
          <span className={`flex items-center gap-2 ${i.ok ? "text-success" : "text-warning"}`}>
            {i.text}
            <span className="led" />
          </span>
        </li>
      ))}
    </ul>
  );
}

const MSGS = [
  "Packet Received",
  "GPS Updated",
  "Pressure Updated",
  "Humidity Updated",
  "MPU6050 Updated",
  "ESP-NOW Connected",
  "Sensor Online",
  "Battery Stable",
  "BMP280 Read OK",
  "Checksum Valid",
];
export function TelemetryLog({ d }: { d: Telemetry }) {
  const [lines, setLines] = useState<{ id: number; t: string; m: string; tone: string }[]>([]);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!d.missionTime) return;
    const now = new Date().toLocaleTimeString("en-GB");
    const extra = MSGS[Math.floor(Math.random() * MSGS.length)] ?? "Sensor Online";
    setLines((l) => [
      ...l.slice(-60),
      {
        id: d.packetCount * 2,
        t: now,
        m: `Packet #${String(d.packetCount).padStart(5, "0")} received · RSSI ${d.signalStrength} dBm`,
        tone: "text-success",
      },
      {
        id: d.packetCount * 2 + 1,
        t: now,
        m: extra,
        tone: extra.includes("GPS") && !d.gpsFix ? "text-warning" : "text-cyan",
      },
    ]);
  }, [d.packetCount]);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [lines]);
  return (
    <div
      ref={box}
      className="h-56 overflow-y-auto rounded-md border border-border bg-background/70 p-3 font-mono text-[11px] leading-relaxed"
    >
      {lines.map((l) => (
        <motion.div key={l.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
          <span className="text-muted-foreground">[{l.t}]</span>{" "}
          <span className="text-amber">OLDMONK›</span> <span className={l.tone}>{l.m}</span>
        </motion.div>
      ))}
      <span className="inline-block h-3 w-2 animate-pulse bg-cyan align-middle" />
    </div>
  );
}
export const LogIcon = Terminal;

export function MiniChart({
  data,
  keys,
  colors,
  area,
}: {
  data: readonly HistoryPoint[];
  keys: (keyof HistoryPoint)[];
  colors: [string, ...string[]];
  area?: boolean;
}) {
  return (
    <div className="h-28">
      <ResponsiveContainer width="100%" height="100%">
        {area ? (
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`g-${String(keys[0])}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={colors[0]} stopOpacity={0.5} />
                <stop offset="1" stopColor={colors[0]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={["dataMin - 0.5", "dataMax + 0.5"]} />
            <Area
              type="monotone"
              dataKey={keys[0] as string}
              stroke={colors[0]}
              strokeWidth={2}
              fill={`url(#g-${String(keys[0])})`}
              isAnimationActive={false}
            />
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <YAxis hide domain={["auto", "auto"]} />
            {keys.map((k, i) => (
              <Line
                key={String(k)}
                type="monotone"
                dataKey={k as string}
                stroke={colors[i] ?? "var(--cyan)"}
                strokeWidth={1.8}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
