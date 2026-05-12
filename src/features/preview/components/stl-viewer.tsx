"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

interface STLViewerProps {
  stlContent: string;
  showWireframe?: boolean;
  className?: string;
}

// Simple STL parser for ASCII STL files
function parseSTL(stlContent: string): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const normals: number[] = [];

  const lines = stlContent.split("\n");
  let currentNormal: [number, number, number] = [0, 0, 0];

  for (const line of lines) {
    const trimmedLine = line?.trim();
    if (!trimmedLine) continue;

    if (trimmedLine.startsWith("facet normal")) {
      const parts = trimmedLine.split(" ");
      if (parts.length >= 5) {
        currentNormal = [
          parseFloat(parts[2] || "0"),
          parseFloat(parts[3] || "0"),
          parseFloat(parts[4] || "0"),
        ];
      }
    } else if (trimmedLine.startsWith("vertex")) {
      const parts = trimmedLine.split(" ");
      if (parts.length >= 4) {
        const x = parseFloat(parts[1] || "0");
        const y = parseFloat(parts[2] || "0");
        const z = parseFloat(parts[3] || "0");

        vertices.push(x, y, z);
        normals.push(currentNormal[0], currentNormal[1], currentNormal[2]);
      }
    }
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));

  // Center the geometry
  geometry.computeBoundingBox();
  if (geometry.boundingBox) {
    const center = new THREE.Vector3();
    geometry.boundingBox.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);
  }

  return geometry;
}

// Component to auto-fit camera to object only when STL changes
function CameraController({
  geometry,
  fitKey,
}: {
  geometry: THREE.BufferGeometry;
  fitKey: string;
}) {
  const { camera, controls } = useThree();
  const hasFitted = useRef<string | null>(null);

  useEffect(() => {
    if (hasFitted.current === fitKey) return; // Only fit once per STL
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (geometry.boundingBox && controls) {
      const box = geometry.boundingBox;
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const distance = maxDim * 2;
      const position = new THREE.Vector3(distance, distance, distance);
      camera.position.copy(position);
      camera.lookAt(0, 0, 0);
      if (typeof (controls as any).target?.set === "function") {
        (controls as any).target.set(0, 0, 0);
        (controls as any).minDistance = maxDim * 0.5;
        (controls as any).maxDistance = maxDim * 4;
        (controls as any).update();
      }
      hasFitted.current = fitKey;
    }
  }, [geometry, camera, controls, fitKey]);
  return null;
}

function STLMesh({
  stlContent,
  showWireframe,
  fitKey,
}: {
  stlContent: string;
  showWireframe: boolean;
  fitKey: string;
}) {
  const geometry = useMemo(() => {
    try {
      return parseSTL(stlContent);
    } catch (error) {
      console.error("Failed to parse STL:", error);
      // Return a simple cube as fallback
      return new THREE.BoxGeometry(5, 5, 5);
    }
  }, [stlContent]);

  return (
    <>
      <CameraController geometry={geometry} fitKey={fitKey} />
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#6366f1" wireframe={showWireframe} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

export function STLViewer({ stlContent, showWireframe = false, className = "" }: STLViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Use stlContent as a key to trigger camera fit only when STL changes
  const fitKey = stlContent ? String(stlContent.length) + stlContent.slice(0, 16) : "none";

  if (!stlContent) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <p className="text-gray-500">No model to display</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <Canvas
        ref={canvasRef}
        camera={{
          position: [15, 15, 15],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        style={{
          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <STLMesh stlContent={stlContent} showWireframe={showWireframe} fitKey={fitKey} />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={1}
          maxDistance={100}
          enableZoom={true}
          enablePan={true}
          enableRotate={true}
          zoomSpeed={0.5}
          rotateSpeed={0.5}
          panSpeed={0.5}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}
