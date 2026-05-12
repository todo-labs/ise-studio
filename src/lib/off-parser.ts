export interface OFFMesh {
  vertices: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  colors: Float32Array | null;
  numVertices: number;
  numFaces: number;
}

export function parseOFF(text: string): OFFMesh {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  let lineIdx = 0;
  if (!lines[lineIdx]?.startsWith("OFF")) {
    throw new Error("Not an OFF file");
  }

  let countStr = lines[lineIdx]!.slice(3).trim();
  lineIdx++;

  if (countStr.length === 0 && lineIdx < lines.length) {
    countStr = lines[lineIdx]!;
    lineIdx++;
  }

  const counts = countStr.split(/\s+/).map(Number);
  const numVertices = Math.max(counts[0] ?? 0, 0) || 0;
  const numFaces = Math.max(counts[1] ?? 0, 0) || 0;

  if (numVertices === 0) {
    return {
      vertices: new Float32Array(0),
      normals: new Float32Array(0),
      indices: new Uint32Array(0),
      colors: null,
      numVertices: 0,
      numFaces: 0,
    };
  }

  const vertices = new Float32Array(numVertices * 3);
  const hasColors = (counts[3] ?? 0) > 0;
  const vertexColors = hasColors ? new Float32Array(numVertices * 3) : null;

  for (let i = 0; i < numVertices && lineIdx < lines.length; i++) {
    const parts = lines[lineIdx]!.split(/\s+/).map(Number);
    lineIdx++;
    const base = i * 3;
    vertices[base] = parts[0] ?? 0;
    vertices[base + 1] = parts[1] ?? 0;
    vertices[base + 2] = parts[2] ?? 0;

    if (vertexColors && parts.length >= 6) {
      vertexColors[base] = (parts[3] ?? 0) / 255;
      vertexColors[base + 1] = (parts[4] ?? 0) / 255;
      vertexColors[base + 2] = (parts[5] ?? 0) / 255;
    }
  }

  const indexList: number[] = [];
  const faceColorList: number[] = [];
  let hasFaceColors = false;

  for (let i = 0; i < numFaces && lineIdx < lines.length; i++) {
    const parts = lines[lineIdx]!.split(/\s+/).map(Number);
    lineIdx++;
    const n = parts[0] ?? 0;

    if (n < 3) continue;

    const v0 = parts[1] ?? 0;
    for (let j = 1; j < n - 1; j++) {
      indexList.push(v0, parts[1 + j] ?? 0, parts[2 + j] ?? 0);
    }

    let r = 0.8, g = 0.8, b = 0.8;
    if (parts.length > 1 + n + 2) {
      hasFaceColors = true;
      r = (parts[1 + n] ?? 0) / 255;
      g = (parts[2 + n] ?? 0) / 255;
      b = (parts[3 + n] ?? 0) / 255;
    }
    const tris = n - 2;
    for (let t = 0; t < tris; t++) {
      faceColorList.push(r, g, b);
    }
  }

  const indices = new Uint32Array(indexList);

  if (hasFaceColors) {
    const flatVertices = new Float32Array(indexList.length * 3);
    const flatColors = new Float32Array(indexList.length * 3);
    const flatIndices = new Uint32Array(indexList.length);

    let colorIdx = 0;
    for (let i = 0; i < indexList.length; i += 3) {
      const r = faceColorList[colorIdx++];
      const g = faceColorList[colorIdx++];
      const b = faceColorList[colorIdx++];

      for (let v = 0; v < 3; v++) {
        const outV = i + v;
        const vIdx = indexList[outV]!;
        flatVertices[outV * 3] = vertices[vIdx * 3]!;
        flatVertices[outV * 3 + 1] = vertices[vIdx * 3 + 1]!;
        flatVertices[outV * 3 + 2] = vertices[vIdx * 3 + 2]!;

        flatIndices[outV] = outV;

        flatColors[outV * 3] = r;
        flatColors[outV * 3 + 1] = g;
        flatColors[outV * 3 + 2] = b;
      }
    }

    const normals = computeNormals(flatVertices, flatIndices);

    return {
      vertices: flatVertices,
      normals,
      indices: flatIndices,
      colors: flatColors,
      numVertices: flatVertices.length / 3,
      numFaces: flatIndices.length / 3,
    };
  } else {
    const normals = computeNormals(vertices, indices);
    return {
      vertices,
      normals,
      indices,
      colors: vertexColors,
      numVertices,
      numFaces,
    };
  }
}

function computeNormals(vertices: Float32Array, indices: Uint32Array): Float32Array {
  const normals = new Float32Array(vertices.length);

  for (let i = 0; i + 2 < indices.length; i += 3) {
    const i0 = indices[i]! * 3;
    const i1 = indices[i + 1]! * 3;
    const i2 = indices[i + 2]! * 3;

    const ax = vertices[i1]! - vertices[i0]!;
    const ay = vertices[i1 + 1]! - vertices[i0 + 1]!;
    const az = vertices[i1 + 2]! - vertices[i0 + 2]!;

    const bx = vertices[i2]! - vertices[i0]!;
    const by = vertices[i2 + 1]! - vertices[i0 + 1]!;
    const bz = vertices[i2 + 2]! - vertices[i0 + 2]!;

    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;

    normals[i0]! += nx;
    normals[i0 + 1]! += ny;
    normals[i0 + 2]! += nz;
    normals[i1]! += nx;
    normals[i1 + 1]! += ny;
    normals[i1 + 2]! += nz;
    normals[i2]! += nx;
    normals[i2 + 1]! += ny;
    normals[i2 + 2]! += nz;
  }

  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.hypot(normals[i]!, normals[i + 1]!, normals[i + 2]!);
    if (len > 0) {
      normals[i]! /= len;
      normals[i + 1]! /= len;
      normals[i + 2]! /= len;
    }
  }

  return normals;
}

export function parseBinarySTL(buffer: ArrayBuffer): OFFMesh {
  const view = new DataView(buffer);
  const numTriangles = view.getUint32(80, true);

  const vertices = new Float32Array(numTriangles * 9);
  const normals = new Float32Array(numTriangles * 9);
  const indices = new Uint32Array(numTriangles * 3);

  let offset = 84;
  for (let i = 0; i < numTriangles; i++) {
    const nx = view.getFloat32(offset, true);
    const ny = view.getFloat32(offset + 4, true);
    const nz = view.getFloat32(offset + 8, true);
    offset += 12;

    for (let v = 0; v < 3; v++) {
      const idx = i * 3 + v;
      indices[idx] = idx;

      vertices[idx * 3] = view.getFloat32(offset, true);
      vertices[idx * 3 + 1] = view.getFloat32(offset + 4, true);
      vertices[idx * 3 + 2] = view.getFloat32(offset + 8, true);
      offset += 12;

      normals[idx * 3] = nx;
      normals[idx * 3 + 1] = ny;
      normals[idx * 3 + 2] = nz;
    }

    offset += 2;
  }

  return {
    vertices,
    normals,
    indices,
    colors: null,
    numVertices: numTriangles * 3,
    numFaces: numTriangles,
  };
}
