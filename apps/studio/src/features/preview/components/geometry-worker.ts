import { parseBinarySTL, parseOFF } from "@ise-studio/geometry/off-parser";

const workerScope = self as unknown as {
  onmessage: (event: MessageEvent<{ format: "stl" | "off"; buffer: ArrayBuffer }>) => void;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};

workerScope.onmessage = (event) => {
  try {
    const { format, buffer } = event.data;
    const mesh = format === "off"
      ? parseOFF(new TextDecoder().decode(buffer))
      : parseBinarySTL(buffer);
    const transferables: Transferable[] = [
      mesh.vertices.buffer as ArrayBuffer,
      mesh.normals.buffer as ArrayBuffer,
      mesh.indices.buffer as ArrayBuffer,
    ];
    if (mesh.colors) transferables.push(mesh.colors.buffer as ArrayBuffer);
    workerScope.postMessage({
      vertices: mesh.vertices,
      normals: mesh.normals,
      indices: mesh.indices,
      colors: mesh.colors,
      numVertices: mesh.numVertices,
      numFaces: mesh.numFaces,
    }, transferables);
  } catch (error) {
    workerScope.postMessage({ error: error instanceof Error ? error.message : "Could not parse geometry." });
  }
};
