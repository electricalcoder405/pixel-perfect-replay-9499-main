import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Radio, Rocket, Satellite, Signal } from "lucide-react";
import { mission } from "@/app/mission";
import { BrandMark, ConnectionIndicator, Eyebrow, SkipLink, Surface, Widget, WidgetGrid } from "@/components/ds";
import { Starfield } from "@/components/mission/Starfield";
import { Button } from "@/components/ui/button";
import { fadeUp } from "@/design/motion";
import { CONNECTION_META } from "@/telemetry/connection";
import { useTelemetrySelector } from "@/telemetry/hooks";
import { HeroScene } from "./HeroScene";
import { MissionCountdown } from "./MissionCountdown";
import { RadarSweep } from "./RadarSweep";
import { TelemetryLinkPanel } from "./TelemetryLinkPanel";

const DATA_PATH = [
  { title: "Sensors", detail: "DHT11, BMP280, MPU6050 and GPS on the CubeSat" },
  { title: "ESP-NOW radio link", detail: "Low-latency wireless link to the ground" },
  { title: "ESP8266 receiver", detail: "Receives packets and hands them to the bridge" },
  { title: "Telemetry bridge", detail: "Forwards each packet over WebSocket" },
  { title: "Mission Control", detail: "This console: live values, attitude, GPS and diagnostics" },
] as const;

export function LandingPage() {
  const live = useTelemetrySelector((s) => CONNECTION_META[s.connection.state].live);

  return (
    <>
      <Starfield />
      <SkipLink />
      <div className="relative min-h-dvh">
        <header className="page-container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandMark label={mission.name} className="h-9 w-9" />
            <span className="font-display text-lg font-semibold tracking-wide">{mission.name}</span>
          </div>
          <nav aria-label="Landing" className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="max-sm:hidden">
              <a href="#about">About</a>
            </Button>
            <Button asChild variant="quiet" size="sm">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          </nav>
        </header>

        <main id="main" tabIndex={-1} className="page-container space-y-20 pb-20 outline-none">
          <section aria-labelledby="hero-title" className="grid items-center gap-8 pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:pt-12">
            <div className="space-y-6">
              <motion.div {...fadeUp(0)} className="flex flex-wrap items-center gap-3">
                <Eyebrow className="text-copper">{mission.name}</Eyebrow>
                <span aria-hidden="true" className="h-px w-8 bg-border" />
                <Eyebrow>{mission.tagline}</Eyebrow>
              </motion.div>

              <motion.h1 {...fadeUp(0.05)} id="hero-title" className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-display">
                <span className="glow-copper text-amber">Old Monk</span>
                <br />
                Mission Control
              </motion.h1>

              <motion.p {...fadeUp(0.1)} className="max-w-xl text-base text-muted-foreground md:text-lg">
                {mission.description}
              </motion.p>

              <motion.div {...fadeUp(0.15)} className="flex flex-wrap items-center gap-3">
                <Button asChild variant="brand" size="xl">
                  <Link to="/dashboard">
                    <Rocket aria-hidden="true" />
                    Launch Dashboard
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="quiet" size="xl">
                  <a href="#about">About the Mission</a>
                </Button>
              </motion.div>

              <motion.div {...fadeUp(0.2)}>
                <ConnectionIndicator />
              </motion.div>
            </div>

            <motion.div {...fadeUp(0.1)} className="mx-auto w-full max-w-xl">
              <HeroScene live={live} />
            </motion.div>
          </section>

          <section aria-label="Mission status">
            <WidgetGrid>
              <Widget span="third" title="Ground Station" icon={<Radio className="h-4 w-4" />}>
                <RadarSweep live={live} />
                <p className="mt-3 text-center text-sm text-muted-foreground">{live ? "Link acquired" : "Searching for signal"}</p>
              </Widget>
              <Widget span="third" title="Mission Countdown" icon={<Rocket className="h-4 w-4" />}>
                <MissionCountdown target={mission.launchAt} />
              </Widget>
              <Widget span="third" title="Telemetry Link" icon={<Signal className="h-4 w-4" />}>
                <TelemetryLinkPanel />
              </Widget>
            </WidgetGrid>
          </section>

          <section id="about" aria-labelledby="about-title" className="grid gap-8 scroll-mt-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-3">
              <Eyebrow className="text-copper">About the mission</Eyebrow>
              <h2 id="about-title" className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
                From sensor to screen, in one console
              </h2>
              <p className="text-muted-foreground">
                {mission.name} is a CubeSat telemetry project. This platform turns the raw packets from the satellite into live readings, a 3D attitude view, GPS tracking and link
                diagnostics, so a team can judge the health of the mission at a glance.
              </p>
            </div>
            <Surface as="div" variant="solid" padding="lg">
              <ol className="space-y-4">
                {DATA_PATH.map((step, i) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-xs text-amber">{i + 1}</span>
                    <div>
                      <p className="font-medium text-foreground">{step.title}</p>
                      <p className="text-sm text-muted-foreground">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Surface>
          </section>
        </main>

        <footer className="page-container flex items-center justify-between border-t border-border py-6">
          <p className="eyebrow">{mission.name} · {mission.title}</p>
          <Satellite aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
        </footer>
      </div>
    </>
  );
}
