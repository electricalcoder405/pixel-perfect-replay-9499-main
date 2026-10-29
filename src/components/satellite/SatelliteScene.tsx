import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges, Line, OrbitControls, Stars } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export type SceneMode = "orbit" | "attitude";

export interface Attitude {
  roll: number;
  pitch: number;
  yaw: number;
}

// three.js cannot parse oklch(), so the scene uses hex equivalents of the theme colours.
const CYAN = "#31C8FF";
const AMBER = "#1D7CF2";
const COPPER = "#31C8FF";
const PURPLE = "#818cf8";

const EARTH_RADIUS = 2;
const ORBIT_RADIUS = 3.4;
const ORBIT_TILT = THREE.MathUtils.degToRad(52);

function panelTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const g = c.getContext("2d");
  if (g) {
    g.fillStyle = "#0a1a3a";
    g.fillRect(0, 0, 128, 256);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 4; x++) {
        const grad = g.createLinearGradient(0, 0, 32, 32);
        grad.addColorStop(0, "#1c3f8f");
        grad.addColorStop(1, "#0d2560");
        g.fillStyle = grad;
        g.fillRect(x * 32 + 2, y * 32 + 2, 28, 28);
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Stylised Earth texture: ocean, deterministic continents and a graticule. Not real geography. */
function earthTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (g) {
    const ocean = g.createLinearGradient(0, 0, 0, h);
    ocean.addColorStop(0, "#0b2a4a");
    ocean.addColorStop(0.5, "#0f4a78");
    ocean.addColorStop(1, "#0b2a4a");
    g.fillStyle = ocean;
    g.fillRect(0, 0, w, h);

    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    g.fillStyle = "#2f6b3f";
    for (let i = 0; i < 46; i++) {
      const cx = rand() * w;
      const cy = h * 0.15 + rand() * h * 0.7;
      const rx = 20 + rand() * 70;
      const ry = 12 + rand() * 40;
      g.globalAlpha = 0.75;
      g.beginPath();
      g.ellipse(cx, cy, rx, ry, rand() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 0.5;
    g.fillStyle = "#e8eef5";
    g.fillRect(0, 0, w, 22);
    g.fillRect(0, h - 22, w, 22);

    g.globalAlpha = 0.18;
    g.strokeStyle = CYAN;
    g.lineWidth = 1;
    for (let x = 0; x <= w; x += w / 24) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }
    for (let y = 0; y <= h; y += h / 12) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    g.globalAlpha = 1;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** The spacecraft. Its rotation follows the telemetry attitude, smoothed between packets. */
function Spacecraft({
  attitude,
  scale = 1,
}: {
  attitude: React.RefObject<Attitude>;
  scale?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const tex = useMemo(panelTexture, []);
  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const k = 1 - Math.exp(-3 * Math.min(delta, 0.05));
    const a = attitude.current;
    g.rotation.x += (THREE.MathUtils.degToRad(a.pitch) - g.rotation.x) * k;
    g.rotation.z += (THREE.MathUtils.degToRad(a.roll) - g.rotation.z) * k;
    const dy = Math.atan2(
      Math.sin(THREE.MathUtils.degToRad(a.yaw) - g.rotation.y),
      Math.cos(THREE.MathUtils.degToRad(a.yaw) - g.rotation.y),
    );
    g.rotation.y += dy * k;
  });

  const panel = (side: 1 | -1) => (
    <group position={[side * 1.75, 0, 0]}>
      <mesh position={[-side * 0.55, 0, 0]}>
        <boxGeometry args={[0.5, 0.06, 0.06]} />
        <meshStandardMaterial color="#888" metalness={1} roughness={0.3} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[1.8, 0.04, 0.95]} />
        <meshStandardMaterial
          map={tex}
          metalness={0.6}
          roughness={0.25}
          emissive="#0a3080"
          emissiveIntensity={0.25}
        />
        <Edges color={CYAN} />
      </mesh>
    </group>
  );

  return (
    <group scale={scale}>
      <group ref={group}>
        <mesh>
          <boxGeometry args={[1, 1.4, 1]} />
          <meshStandardMaterial color="#c9ccd2" metalness={0.9} roughness={0.25} />
          <Edges color={CYAN} />
        </mesh>
        {[-0.5, 0, 0.5].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[1.04, 0.05, 1.04]} />
            <meshStandardMaterial color={COPPER} metalness={1} roughness={0.3} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.51]}>
          <planeGeometry args={[0.7, 0.9]} />
          <meshStandardMaterial map={tex} metalness={0.5} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.95, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.6]} />
          <meshStandardMaterial color="#ddd" metalness={1} roughness={0.2} />
        </mesh>
        <mesh position={[0, 1.25, 0]}>
          <sphereGeometry args={[0.05]} />
          <meshStandardMaterial color={CYAN} emissive={CYAN} emissiveIntensity={3} />
        </mesh>
        {panel(1)}
        {panel(-1)}
        {/* Body axes: X amber, Y cyan, Z purple. */}
        <axesHelper args={[1.6]} />
      </group>
    </group>
  );
}

function Earth() {
  const ref = useRef<THREE.Mesh>(null);
  const map = useMemo(earthTexture, []);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.05;
  });
  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <meshStandardMaterial map={map} roughness={0.9} metalness={0} />
      </mesh>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS * 1.035, 48, 48]} />
        <meshBasicMaterial
          color={CYAN}
          transparent
          opacity={0.12}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/** Illustrative circular orbit. It is not computed from telemetry: the hardware reports no orbital elements. */
function OrbitPath() {
  const points = useMemo(
    () =>
      Array.from({ length: 129 }, (_, i) => {
        const a = (i / 128) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a) * ORBIT_RADIUS, 0, Math.sin(a) * ORBIT_RADIUS);
      }),
    [],
  );
  return (
    <group rotation={[ORBIT_TILT, 0, 0]}>
      <Line
        points={points}
        color={AMBER}
        lineWidth={1.2}
        transparent
        opacity={0.7}
        dashed
        dashSize={0.18}
        gapSize={0.12}
      />
    </group>
  );
}

function OrbitingSpacecraft({ attitude }: { attitude: React.RefObject<Attitude> }) {
  const carrier = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const c = carrier.current;
    if (!c) return;
    const a = clock.elapsedTime * 0.12;
    c.position.set(Math.cos(a) * ORBIT_RADIUS, 0, Math.sin(a) * ORBIT_RADIUS);
  });
  return (
    <group rotation={[ORBIT_TILT, 0, 0]}>
      <group ref={carrier}>
        <Spacecraft attitude={attitude} scale={0.2} />
      </group>
    </group>
  );
}

/** Moves the camera when the view mode changes or the user presses Reset. */
function CameraRig({ mode, resetKey }: { mode: SceneMode; resetKey: number }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3;
    update: () => void;
  } | null;
  useEffect(() => {
    if (mode === "orbit") camera.position.set(0, 3.2, 8.5);
    else camera.position.set(2.6, 1.6, 5.2);
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.update();
    }
  }, [camera, controls, mode, resetKey]);
  return null;
}

export function SatelliteScene({
  attitude,
  mode,
  resetKey,
}: {
  attitude: Attitude;
  mode: SceneMode;
  resetKey: number;
}) {
  const ref = useRef<Attitude>(attitude);
  ref.current = attitude;
  return (
    <Canvas
      camera={{ position: [0, 3.2, 8.5], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
      aria-label="Interactive 3D satellite view"
    >
      <color attach="background" args={["#05070d"]} />
      <Stars radius={90} depth={50} count={3500} factor={4} saturation={0} fade speed={0.6} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[6, 4, 5]} intensity={2.4} color="#d4e8ff" />
      <pointLight position={[-4, -2, 3]} intensity={14} color={CYAN} />
      <pointLight position={[0, 4, -5]} intensity={8} color={PURPLE} />

      {mode === "orbit" ? (
        <>
          <Earth />
          <OrbitPath />
          <OrbitingSpacecraft attitude={ref} />
        </>
      ) : (
        <>
          <group position={[-7, -3.5, -12]} scale={1.1}>
            <Earth />
          </group>
          <Spacecraft attitude={ref} scale={1} />
        </>
      )}

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        minDistance={mode === "orbit" ? 4.5 : 2.5}
        maxDistance={20}
      />
      <CameraRig mode={mode} resetKey={resetKey} />
    </Canvas>
  );
}
