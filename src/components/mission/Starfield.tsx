import { useEffect, useRef } from "react";

export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const g = c.getContext("2d")!;
    let w = 0,
      h = 0,
      raf = 0;
    const resize = () => {
      w = c.width = innerWidth;
      h = c.height = innerHeight;
    };
    resize();
    addEventListener("resize", resize);
    const stars = Array.from({ length: 260 }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: Math.random() * 0.8 + 0.2,
      p: Math.random() * 6,
    }));
    const draw = (t: number) => {
      g.clearRect(0, 0, w, h);
      for (const s of stars) {
        s.x -= 0.00004 * s.z;
        if (s.x < 0) s.x = 1;
        const a = 0.35 + 0.65 * Math.abs(Math.sin(t / 1400 + s.p)) * s.z;
        g.fillStyle = s.z > 0.9 ? `rgba(0,229,255,${a})` : `rgba(255,255,255,${a})`;
        g.beginPath();
        g.arc(s.x * w, s.y * h, s.z * 1.3, 0, 7);
        g.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
    };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 bg-transparent">
      <div className="absolute -left-40 top-10 h-[40rem] w-[40rem] rounded-full bg-amber/10 blur-[140px]" />
      <div className="absolute -right-40 bottom-0 h-[44rem] w-[44rem] rounded-full bg-cyan/10 blur-[160px]" />
      <canvas ref={ref} className="absolute inset-0" />
      <div className="absolute inset-0 scanline" />
    </div>
  );
}
