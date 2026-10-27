import { normalizeAngle } from "./attitude";
import type { Telemetry } from "./model";
import { ACCEL } from "./units";

/** Barometric altitude from pressure (hPa). */
export function altitudeFromPressure(p: number, sea = 1013.25) {
  return 44330 * (1 - Math.pow(p / sea, 0.1903));
}

/**
 * Advances the simulated telemetry by one second.
 * `rand` is injectable so tests are deterministic.
 */
export function simulate(prev: Telemetry, rand: () => number = Math.random): Telemetry {
  const j = (amp: number) => (rand() - 0.5) * amp;
  const g = ACCEL.gravity;
  const accelNoise = (0.1 / 9.80665) * g;

  const t = prev.missionTime + 1;
  const pressure = 1008 + Math.sin(t / 30) * 3 + j(0.4);
  const rollRaw = Math.sin(t / 6) * 28 + j(2);
  const pitchRaw = Math.sin(t / 9 + 1) * 18 + j(2);
  const roll = normalizeAngle(rollRaw);
  const pitch = normalizeAngle(pitchRaw);
  const yaw = (prev.yaw + 6 + j(1) + 360) % 360;
  let battery = prev.battery + (prev.charging ? 0.15 : -0.08);
  let charging = prev.charging;
  if (battery >= 99) charging = false;
  if (battery <= 60) charging = true;
  battery = Math.min(100, Math.max(0, battery));
  return {
    temperature: 24.5 + Math.sin(t / 20) * 1.8 + j(0.2),
    humidity: 48 + Math.sin(t / 25) * 6 + j(0.5),
    pressure,
    altitude: altitudeFromPressure(pressure),
    latitude: 28.6139 + Math.sin(t / 50) * 0.002 + j(0.0002),
    longitude: 77.209 + Math.cos(t / 50) * 0.002 + j(0.0002),
    accelerationX: Math.sin((roll * Math.PI) / 180) * g + j(accelNoise),
    accelerationY: Math.sin((pitch * Math.PI) / 180) * g + j(accelNoise),
    accelerationZ: g * Math.cos((roll * Math.PI) / 180) + j(accelNoise),
    gyroX: roll - prev.roll, gyroY: pitch - prev.pitch, gyroZ: 6 + j(1),
    roll, pitch, yaw, rollRaw, pitchRaw,
    packetCount: prev.packetCount + 1,
    battery, charging, missionTime: t,
    signalStrength: Math.round(-62 + Math.sin(t / 10) * 8 + j(3)),
    gpsFix: t % 47 > 2, connected: true,
  };
}
