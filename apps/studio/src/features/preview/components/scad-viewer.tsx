import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three-stdlib";

interface SCADViewerProps {
  geometryData: Uint8Array | null;
  geometryFormat: "stl" | "off";
  showWireframe?: boolean;
  onError?: (message: string) => void;
}

interface ParsedGeometry {
  vertices: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  colors: Float32Array | null;
}

export function SCADViewer({ geometryData, geometryFormat, showWireframe = false, onError }: SCADViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !geometryData) return;

    let disposed = false;
    let disposeScene = () => {};
    const worker = new Worker(new URL("./geometry-worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<ParsedGeometry & { error?: string }>) => {
      if (disposed) return;
      worker.terminate();
      if (event.data.error) {
        onError?.(event.data.error);
        return;
      }
      void mountGeometry(canvas, event.data, showWireframe, () => disposed, onError)
        .then((cleanup) => {
          if (disposed) cleanup();
          else disposeScene = cleanup;
        })
        .catch((error: unknown) => {
          if (!disposed) {
            onError?.(error instanceof Error ? error.message : "Could not start the 3D preview.");
          }
        });
    };
    worker.onerror = () => {
      worker.terminate();
      if (!disposed) onError?.("The geometry parser worker stopped unexpectedly.");
    };

    const buffer = geometryData.buffer.slice(
      geometryData.byteOffset,
      geometryData.byteOffset + geometryData.byteLength,
    ) as ArrayBuffer;
    worker.postMessage({ format: geometryFormat, buffer }, [buffer]);

    return () => {
      disposed = true;
      worker.terminate();
      disposeScene();
    };
  }, [geometryData, geometryFormat, onError, showWireframe]);

  return <canvas ref={canvasRef} className="h-full min-h-72 w-full" aria-label="OpenSCAD preview" />;
}

export const STLViewer = SCADViewer;

async function mountGeometry(
  canvas: HTMLCanvasElement,
  parsed: ParsedGeometry,
  showWireframe: boolean,
  isCancelled: () => boolean,
  onError?: (message: string) => void,
) {
  const preferWebGPU = new URLSearchParams(window.location.search).get("renderer") === "webgpu";
  const renderer = await createRenderer(canvas, preferWebGPU);
  if (!renderer || isCancelled()) {
    renderer?.dispose();
    if (!renderer) onError?.("WebGL is unavailable in this browser.");
    return () => {};
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#111827");
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10_000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(parsed.vertices, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(parsed.normals, 3));
  geometry.setIndex(new THREE.BufferAttribute(parsed.indices, 1));
  if (parsed.colors) geometry.setAttribute("color", new THREE.BufferAttribute(parsed.colors, 3));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const material = new THREE.MeshStandardMaterial({
    color: "#60a5fa",
    roughness: 0.62,
    metalness: 0.08,
    vertexColors: Boolean(parsed.colors),
    wireframe: showWireframe,
  });
  const mesh = new THREE.Mesh(geometry, material);
  // OpenSCAD uses Z-up coordinates while Three.js uses Y-up coordinates.
  // Rotate the model so OpenSCAD's vertical axis sits on the preview ground
  // plane instead of pointing toward the camera.
  const model = new THREE.Group();
  model.rotation.x = -Math.PI / 2;
  model.add(mesh);
  scene.add(model);

  const radius = Math.max(geometry.boundingSphere?.radius ?? 10, 1);
  camera.position.set(radius * 2.2, radius * 1.7, radius * 2.2);
  camera.near = Math.max(radius / 1_000, 0.01);
  camera.far = radius * 20;
  camera.updateProjectionMatrix();
  controls.update();
  scene.add(new THREE.HemisphereLight("#ffffff", "#334155", 2));
  const keyLight = new THREE.DirectionalLight("#ffffff", 3);
  keyLight.position.set(radius * 2, radius * 3, radius * 2);
  scene.add(keyLight);
  scene.add(new THREE.GridHelper(radius * 4, 20, "#475569", "#1e293b"));

  const resize = () => {
    const width = canvas.clientWidth || 640;
    const height = canvas.clientHeight || 480;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  let animationFrame = 0;
  let renderFailed = false;
  const render = () => {
    if (renderFailed || isCancelled()) return;
    try {
      controls.update();
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(render);
    } catch (error) {
      renderFailed = true;
      onError?.(
        error instanceof Error
          ? `The 3D renderer failed: ${error.message}`
          : "The 3D renderer failed.",
      );
      renderer.dispose();
    }
  };
  render();

  return () => {
    cancelAnimationFrame(animationFrame);
    observer.disconnect();
    controls.dispose();
    renderer.dispose();
    geometry.dispose();
    material.dispose();
    scene.clear();
  };
}

interface RendererLike {
  domElement: HTMLCanvasElement;
  setPixelRatio: (ratio: number) => void;
  setSize: (width: number, height: number, updateStyle?: boolean) => void;
  render: (scene: THREE.Scene, camera: THREE.Camera) => void;
  dispose: () => void;
}

async function createRenderer(canvas: HTMLCanvasElement, preferWebGPU: boolean): Promise<RendererLike | null> {
  if (preferWebGPU && "gpu" in navigator) {
    try {
      const { WebGPURenderer } = await import("three/webgpu");
      const renderer = new WebGPURenderer({ canvas, antialias: true, alpha: true });
      await renderer.init();
      return renderer as unknown as RendererLike;
    } catch {
      // The opt-in renderer is capability-gated; use WebGL as a safe fallback.
    }
  }
  try {
    return new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return null;
  }
}
