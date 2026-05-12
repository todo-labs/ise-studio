import { useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { useThemeMode } from "@/components/theme/theme-provider";
import { parseOFF, parseBinarySTL } from "@/lib/off-parser";

interface SCADViewerProps {
  data: Uint8Array | null;
  format: "stl" | "off";
  showWireframe?: boolean;
  className?: string;
  onError?: (message: string) => void;
}

export function SCADViewer({ data, format, showWireframe = false, className = "", onError }: SCADViewerProps) {
  const { theme } = useThemeMode();

  const geometry = useMemo(() => {
    if (!data) return null;
    try {
      let mesh;
      if (format === "off") {
        const text = new TextDecoder().decode(data);
        mesh = parseOFF(text);
      } else {
        mesh = parseBinarySTL(data.buffer as ArrayBuffer);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(mesh.vertices, 3));
      geo.setAttribute("normal", new THREE.BufferAttribute(mesh.normals, 3));
      geo.setIndex(new THREE.BufferAttribute(mesh.indices, 1));

      if (mesh.colors) {
        geo.setAttribute("color", new THREE.BufferAttribute(mesh.colors, 3));
      }

      geo.computeBoundingSphere();
      geo.computeBoundingBox();
      return geo;
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Failed to parse geometry");
      return null;
    }
  }, [data, format, onError]);

  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);

  if (!data || !geometry) {
    return (
      <div className={`flex min-h-0 items-center justify-center bg-muted/40 ${className}`}>
        <p className="text-muted-foreground text-sm">Compile OpenSCAD code to preview</p>
      </div>
    );
  }

  const fitKey = `${format}-${geometry.uuid}-${showWireframe ? "wire" : "solid"}`;
  const hasColors = geometry.getAttribute("color") !== undefined;

  return (
    <div className={`relative min-h-0 overflow-hidden ${className}`}>
      <Canvas
        className="absolute inset-0"
        camera={{ position: [60, 60, 60], fov: 45, near: 0.1, far: 10000 }}
        style={{
          width: "100%",
          height: "100%",
          background:
            theme === "dark"
              ? "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)"
              : "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)",
        }}
      >
        <ambientLight intensity={theme === "dark" ? 0.6 : 1} />
        <directionalLight position={[4, 5, 6]} intensity={theme === "dark" ? 1.1 : 1.25} />
        <directionalLight position={[-3, -4, -5]} intensity={theme === "dark" ? 0.3 : 0.5} />
        <FittedModel fitKey={fitKey} geometry={geometry} showWireframe={showWireframe} theme={theme} hasColors={hasColors} />
      </Canvas>
    </div>
  );
}

function FittedModel({
  fitKey,
  geometry,
  showWireframe,
  theme,
  hasColors,
}: {
  fitKey: string;
  geometry: THREE.BufferGeometry;
  showWireframe: boolean;
  theme: "light" | "dark";
  hasColors: boolean;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  return (
    <>
      <CameraFit controlsRef={controlsRef} fitKey={fitKey} geometry={geometry} />
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={hasColors ? "#ffffff" : theme === "dark" ? "#6366f1" : "#4f46e5"}
          metalness={theme === "dark" ? 0.2 : 0.1}
          roughness={theme === "dark" ? 0.5 : 0.35}
          side={THREE.DoubleSide}
          wireframe={showWireframe}
          vertexColors={hasColors}
        />
      </mesh>
      <OrbitControls
        ref={controlsRef}
        enableDamping
        enablePan
        enableRotate
        enableZoom
        dampingFactor={0.05}
        rotateSpeed={0.6}
      />
    </>
  );
}

function CameraFit({
  controlsRef,
  fitKey,
  geometry,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  fitKey: string;
  geometry: THREE.BufferGeometry;
}) {
  const { camera, size } = useThree();
  const lastFitKey = useRef<string | null>(null);

  useEffect(() => {
    if (size.width <= 0 || size.height <= 0) return;
    if (lastFitKey.current === fitKey) return;

    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (!box || box.isEmpty()) return;

    const boxSize = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(boxSize.x, boxSize.y, boxSize.z, 1);
    const perspective = camera as THREE.PerspectiveCamera;
    const distance = Math.max(maxDim * 3, 10);

    const viewDirection = new THREE.Vector3(1, 0.8, 0.7).normalize();
    perspective.position.copy(center).addScaledVector(viewDirection, distance);
    perspective.near = Math.max(distance / 100, 0.01);
    perspective.far = Math.max(distance * 100, 10000);
    perspective.updateProjectionMatrix();
    perspective.lookAt(center);

    const controls = controlsRef.current;
    if (controls) {
      controls.target.copy(center);
      controls.minDistance = Math.max(maxDim * 0.5, 1);
      controls.maxDistance = Math.max(maxDim * 8, distance * 4);
      controls.update();
    }

    lastFitKey.current = fitKey;
  }, [camera, controlsRef, fitKey, geometry, size.height, size.width]);

  return null;
}
