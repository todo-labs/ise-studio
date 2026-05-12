import { useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { useThemeMode } from "@/components/theme/theme-provider";
import { buildGeometryFromDSL } from "@/lib/dsl";
import type { DSLNode } from "@/lib/dsl";

interface DSLViewerProps {
  node: DSLNode | null;
  showWireframe?: boolean;
  className?: string;
  onGeometryError?: (message: string) => void;
  resolution?: number;
}

export function DSLViewer({
  node,
  showWireframe = false,
  className = "",
  onGeometryError,
  resolution,
}: DSLViewerProps) {
  const { theme } = useThemeMode();
  const geometryResult = useMemo(() => {
    if (!node) return null;
    try {
      return buildGeometryFromDSL(node, {
        resolution,
      });
    } catch (error) {
      onGeometryError?.(error instanceof Error ? error.message : "Failed to build geometry");
      return null;
    }
  }, [node, onGeometryError, resolution]);

  useEffect(() => {
    return () => {
      geometryResult?.geometry.dispose();
    };
  }, [geometryResult]);

  if (!node || !geometryResult) {
    return (
      <div className={`flex min-h-0 items-center justify-center bg-muted/40 ${className}`}>
        <p className="text-muted-foreground text-sm">Compile DSL code to preview the model</p>
      </div>
    );
  }

  const fitKey = `${node.type}-${geometryResult.geometry.uuid}-${showWireframe ? "wire" : "solid"}`;

  return (
    <div className={`relative min-h-0 overflow-hidden ${className}`}>
      <Canvas
        className="absolute inset-0"
        camera={{
          position: [60, 60, 60],
          fov: 45,
          near: 0.1,
          far: 1000,
        }}
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
        <FittedModel
          fitKey={fitKey}
          geometry={geometryResult.geometry}
          scale={geometryResult.gridScale}
          showWireframe={showWireframe}
          theme={theme}
        />
      </Canvas>
    </div>
  );
}

function FittedModel({
  fitKey,
  geometry,
  scale,
  showWireframe,
  theme,
}: {
  fitKey: string;
  geometry: THREE.BufferGeometry;
  scale: number;
  showWireframe: boolean;
  theme: "light" | "dark";
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  return (
    <>
      <CameraFit controlsRef={controlsRef} fitKey={fitKey} geometry={geometry} scale={scale} />
      <mesh geometry={geometry} scale={scale}>
        <meshStandardMaterial
          color={theme === "dark" ? "#6366f1" : "#4f46e5"}
          metalness={theme === "dark" ? 0.2 : 0.1}
          roughness={theme === "dark" ? 0.5 : 0.35}
          side={THREE.DoubleSide}
          wireframe={showWireframe}
        />
      </mesh>
      <OrbitControls
        ref={controlsRef}
        enableDamping
        enablePan
        enableRotate
        enableZoom={false}
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
  scale,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  fitKey: string;
  geometry: THREE.BufferGeometry;
  scale: number;
}) {
  const { camera, size } = useThree();
  const lastFitKey = useRef<string | null>(null);

  useEffect(() => {
    if (size.width <= 0 || size.height <= 0) return;
    if (lastFitKey.current === fitKey) return;

    if (!geometry.boundingBox) {
      geometry.computeBoundingBox();
    }

    const sourceBox = geometry.boundingBox;
    if (!sourceBox || sourceBox.isEmpty()) return;

    const box = sourceBox.clone();
    box.min.multiplyScalar(scale);
    box.max.multiplyScalar(scale);

    const boxSize = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(boxSize.x, boxSize.y, boxSize.z, 1);
    const perspective = camera as THREE.PerspectiveCamera;
    const distance = Math.max(maxDim * 3, 10);

    const viewDirection = new THREE.Vector3(1, 0.8, 0.7).normalize();
    perspective.position.copy(center).addScaledVector(viewDirection, distance);
    perspective.near = Math.max(distance / 100, 0.01);
    perspective.far = Math.max(distance * 100, 1000);
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
  }, [camera, controlsRef, fitKey, geometry, scale, size.height, size.width]);

  return null;
}
