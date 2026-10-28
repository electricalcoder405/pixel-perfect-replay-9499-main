import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, Float, Edges } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function panelTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#0a1a3a";
  g.fillRect(0, 0, 128, 256);
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 4; x++) {
      const grad = g.createLinearGradient(0, 0, 32, 32);
      grad.addColorStop(0, "#1c3f8f");
      grad.addColorStop(1, "#0d2560");
      g.fillStyle = grad;
      g.fillRect(x * 32 + 2, y * 32 + 2, 28, 28);
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Sat({
  target,
}: {
  target: React.RefObject<{ roll: number; pitch: number; yaw: number }>;
}) {
  const g = useRef<THREE.Group>(null);
  const tex = useMemo(panelTexture, []);
  useFrame((_, d) => {
    if (!g.current) return;
    const dt = Math.min(d, 0.05),
      k = 1 - Math.exp(-3 * dt);
    const r = target.current!;
    const tx = THREE.MathUtils.degToRad(r.pitch),
      tz = THREE.MathUtils.degToRad(r.roll),
      ty = THREE.MathUtils.degToRad(r.yaw);
    g.current.rotation.x += (tx - g.current.rotation.x) * k;
    g.current.rotation.z += (tz - g.current.rotation.z) * k;
    let dy = ty - g.current.rotation.y;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    g.current.rotation.y += dy * k;
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
        <Edges color="#6fd8ff" />
      </mesh>
    </group>
  );
  return (
    <group ref={g}>
      <mesh>
        <boxGeometry args={[1, 1.4, 1]} />
        <meshStandardMaterial color="#c9ccd2" metalness={0.95} roughness={0.22} />
        <Edges color="#00e5ff" />
      </mesh>
      {[-0.5, 0, 0.5].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[1.04, 0.05, 1.04]} />
          <meshStandardMaterial color="#c97a21" metalness={1} roughness={0.3} />
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
        <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={3} />
      </mesh>
      {panel(1)}
      {panel(-1)}
    </group>
  );
}

export function CubeSat({ roll, pitch, yaw }: { roll: number; pitch: number; yaw: number }) {
  const target = useRef({ roll, pitch, yaw });
  target.current = { roll, pitch, yaw };
  return (
    <Canvas
      camera={{ position: [0, 0.6, 5.2], fov: 45 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 5, 3]} intensity={2.2} color="#ffe2b8" />
      <pointLight position={[-3, -1, 2]} intensity={12} color="#00e5ff" />
      <Environment resolution={64}>
        <Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} />
        <Lightformer
          intensity={1.5}
          color="#00e5ff"
          position={[-5, 1, -1]}
          rotation-y={Math.PI / 2}
          scale={[20, 1, 1]}
        />
        <Lightformer
          intensity={1.2}
          color="#c97a21"
          position={[5, -1, 1]}
          rotation-y={-Math.PI / 2}
          scale={[20, 1, 1]}
        />
      </Environment>
      <Float speed={1.5} rotationIntensity={0} floatIntensity={0.8}>
        <Sat target={target} />
      </Float>
    </Canvas>
  );
}
