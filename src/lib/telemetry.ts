import { useEffect, useRef, useState } from "react";

/** Single telemetry object — replace the simulator with live ESP32 data later. */
export interface Telemetry {
  temperature: number;
  humidity: number;
  pressure: number;
  altitude: number;
  latitude: number;
  longitude: number;
  accelerationX: number;
  accelerationY: number;
  accelerationZ: number;
  gyroX: number;
  gyroY: number;
  gyroZ: number;
  roll: number;
  pitch: number;
  yaw: number;
  packetCount: number;
  battery: number;
  charging: boolean;
  missionTime: number;
  signalStrength: number;
  gpsFix: boolean;
  connected: boolean;
}

export const initialTelemetry: Telemetry = {
  temperature: 24.6, humidity: 48, pressure: 1008.4, altitude: 41,
  latitude: 28.6139, longitude: 77.209,
  accelerationX: 0.02, accelerationY: -0.01, accelerationZ: 9.81,
  gyroX: 0, gyroY: 0, gyroZ: 0, roll: 0, pitch: 0, yaw: 0,
  packetCount: 0, battery: 87, charging: true, missionTime: 0,
  signalStrength: -62, gpsFix: true, connected: true,
};

/** Barometric altitude from pressure (hPa). */
export function altitudeFromPressure(p: number, sea = 1013.25) {
  return 44330 * (1 - Math.pow(p / sea, 0.1903));
}

const j = (amp: number) => (Math.random() - 0.5) * amp;

export function simulate(prev: Telemetry): Telemetry {
  const t = prev.missionTime + 1;
  const pressure = 1008 + Math.sin(t / 30) * 3 + j(0.4);
  const roll = Math.sin(t / 6) * 28 + j(2);
  const pitch = Math.sin(t / 9 + 1) * 18 + j(2);
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
    accelerationX: Math.sin(roll * Math.PI / 180) * 9.81 + j(0.1),
    accelerationY: Math.sin(pitch * Math.PI / 180) * 9.81 + j(0.1),
    accelerationZ: 9.81 * Math.cos(roll * Math.PI / 180) + j(0.1),
    gyroX: roll - prev.roll, gyroY: pitch - prev.pitch, gyroZ: 6 + j(1),
    roll, pitch, yaw,
    packetCount: prev.packetCount + 1,
    battery, charging, missionTime: t,
    signalStrength: Math.round(-62 + Math.sin(t / 10) * 8 + j(3)),
    gpsFix: t % 47 > 2, connected: true,
  };
}

export interface HistoryPoint { t: number; temperature: number; pressure: number; humidity: number; ax: number; ay: number; az: number; gx: number; gy: number; gz: number }

export function useTelemetry() {
  const [data, setData] = useState<Telemetry>(initialTelemetry);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const ref = useRef(data);
  useEffect(() => {
    const id = setInterval(() => {
      const next = simulate(ref.current);
      ref.current = next;
      setData(next);
      setHistory((h) => [...h.slice(-59), {
        t: next.missionTime, temperature: +next.temperature.toFixed(2), pressure: +next.pressure.toFixed(2),
        humidity: +next.humidity.toFixed(2), ax: +next.accelerationX.toFixed(2), ay: +next.accelerationY.toFixed(2),
        az: +next.accelerationZ.toFixed(2), gx: +next.gyroX.toFixed(2), gy: +next.gyroY.toFixed(2), gz: +next.gyroZ.toFixed(2),
      }]);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return { data, history };
}

export const fmtTime = (s: number) =>
  `T+${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
