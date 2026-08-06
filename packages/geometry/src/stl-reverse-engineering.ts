export interface STLReverseEngineeringResult {
  format: "ascii" | "binary";
  triangles: number;
  bounds: { min: [number, number, number]; max: [number, number, number] };
  dimensions: [number, number, number];
  center: [number, number, number];
  inferredShape: "cube" | "cylinder" | "sphere" | "mesh";
  confidence: number;
  parameters: Record<string, number>;
  code: string;
}

interface Triangle {
  vertices: [[number, number, number], [number, number, number], [number, number, number]];
}

type ShapeInference = {
  shape: STLReverseEngineeringResult["inferredShape"];
  confidence: number;
  parameters: Record<string, number>;
};

export function reverseEngineerSTL(data: ArrayBuffer | Uint8Array): STLReverseEngineeringResult {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const binary =
    parseBinaryTriangles(bytes) ?? parseAsciiTriangles(new TextDecoder().decode(bytes));
  if (!binary.triangles.length) throw new Error("The STL file does not contain any triangles.");

  const bounds = calculateBounds(binary.triangles);
  const dimensions: [number, number, number] = [
    bounds.max[0] - bounds.min[0],
    bounds.max[1] - bounds.min[1],
    bounds.max[2] - bounds.min[2],
  ];
  const center: [number, number, number] = [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ];
  const inference = inferShape(binary.triangles, dimensions);
  const code = generateParametricOpenSCAD({
    center,
    dimensions,
    bounds,
    inference,
    triangles: binary.triangles,
  });

  return {
    format: binary.format,
    triangles: binary.triangles.length,
    bounds,
    dimensions,
    center,
    inferredShape: inference.shape,
    confidence: inference.confidence,
    parameters: inference.parameters,
    code,
  };
}

export function generateParametricOpenSCAD(input: {
  center: [number, number, number];
  dimensions: [number, number, number];
  bounds: STLReverseEngineeringResult["bounds"];
  inference: {
    shape: STLReverseEngineeringResult["inferredShape"];
    confidence: number;
    parameters: Record<string, number>;
  };
  triangles: readonly Triangle[];
}) {
  const { center, dimensions, inference, triangles } = input;
  const origin = `translate([${vector(center)}])`;
  const note = `// STL reverse engineering: ${inference.shape} (${Math.round(inference.confidence * 100)}% confidence)\n`;

  switch (inference.shape) {
    case "cube":
      return `${note}${origin} cube([${vector(dimensions)}], center = true);\n`;
    case "cylinder":
      return `${note}${origin} cylinder(h = ${number(inference.parameters.height ?? 0)}, r = ${number(inference.parameters.radius ?? 0)}, center = true);\n`;
    case "sphere":
      return `${note}${origin} sphere(r = ${number(inference.parameters.radius ?? 0)});\n`;
    case "mesh":
      return `${note}${origin} polyhedron(\n  points = [\n${trianglesToPoints(triangles)}\n  ],\n  faces = [\n${trianglesToFaces(triangles)}\n  ]\n);\n`;
  }
}

function parseBinaryTriangles(bytes: Uint8Array) {
  if (bytes.length < 84) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint32(80, true);
  if (count === 0 || 84 + count * 50 > bytes.length) return null;

  const triangles: Triangle[] = [];
  let offset = 84;
  for (let index = 0; index < count; index += 1) {
    offset += 12;
    const vertices = [] as unknown as Triangle["vertices"];
    for (let vertex = 0; vertex < 3; vertex += 1) {
      vertices[vertex] = [
        view.getFloat32(offset, true),
        view.getFloat32(offset + 4, true),
        view.getFloat32(offset + 8, true),
      ];
      offset += 12;
    }
    triangles.push({ vertices });
    offset += 2;
  }
  return { format: "binary" as const, triangles };
}

function parseAsciiTriangles(text: string) {
  const matches = [...text.matchAll(/vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/gi)];
  const triangles: Triangle[] = [];
  for (let index = 0; index + 2 < matches.length; index += 3) {
    triangles.push({
      vertices: [
        [toNumber(matches[index]![1]), toNumber(matches[index]![2]), toNumber(matches[index]![3])],
        [
          toNumber(matches[index + 1]![1]),
          toNumber(matches[index + 1]![2]),
          toNumber(matches[index + 1]![3]),
        ],
        [
          toNumber(matches[index + 2]![1]),
          toNumber(matches[index + 2]![2]),
          toNumber(matches[index + 2]![3]),
        ],
      ],
    });
  }
  return { format: "ascii" as const, triangles };
}

function inferShape(
  triangles: readonly Triangle[],
  dimensions: [number, number, number],
): ShapeInference {
  const uniquePoints = new Set(
    triangles.flatMap(({ vertices }) =>
      vertices.map((point) => point.map((value) => number(value)).join(",")),
    ),
  );
  const axisAligned = triangles.every(({ vertices }) => {
    const [a, b, c] = vertices;
    const ab: [number, number, number] = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac: [number, number, number] = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const normal: [number, number, number] = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ];
    const length = Math.hypot(...normal);
    return length === 0 || normal.filter((value) => Math.abs(value) > length * 0.01).length === 1;
  });

  if (axisAligned && triangles.length === 12 && uniquePoints.size === 8) {
    return {
      shape: "cube" as const,
      confidence: 0.98,
      parameters: { width: dimensions[0], depth: dimensions[1], height: dimensions[2] },
    };
  }

  const equalDimensions = dimensions.every(
    (value) => Math.abs(value - dimensions[0]) <= Math.max(dimensions[0] * 0.03, 0.001),
  );
  if (equalDimensions && triangles.length >= 16 && uniquePoints.size > 20) {
    return { shape: "sphere" as const, confidence: 0.7, parameters: { radius: dimensions[0] / 2 } };
  }

  const largest = Math.max(...dimensions);
  const heightAxis = dimensions.indexOf(largest);
  const radial = dimensions.filter((_, index) => index !== heightAxis);
  if (
    triangles.length >= 16 &&
    Math.abs(radial[0]! - radial[1]!) <= Math.max(radial[0]! * 0.05, 0.001)
  ) {
    return {
      shape: "cylinder" as const,
      confidence: 0.65,
      parameters: { radius: radial[0]! / 2, height: largest },
    };
  }

  return { shape: "mesh" as const, confidence: 0.35, parameters: {} };
}

function calculateBounds(triangles: readonly Triangle[]): STLReverseEngineeringResult["bounds"] {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const triangle of triangles)
    for (const point of triangle.vertices)
      for (let axis = 0; axis < 3; axis += 1) {
        min[axis] = Math.min(min[axis]!, point[axis]!);
        max[axis] = Math.max(max[axis]!, point[axis]!);
      }
  return { min, max };
}

function trianglesToPoints(triangles: readonly Triangle[]) {
  const points: string[] = [];
  for (const triangle of triangles)
    for (const point of triangle.vertices) points.push(`    [${vector(point)}],`);
  return points.join("\n");
}

function trianglesToFaces(triangles: readonly Triangle[]) {
  return triangles
    .map((_, index) => `    [${index * 3}, ${index * 3 + 1}, ${index * 3 + 2}],`)
    .join("\n");
}

function vector(values: readonly number[]) {
  return values.map(number).join(", ");
}
function number(value: number) {
  return Number.isFinite(value) ? `${Math.round(value * 1000) / 1000}` : "0";
}
function toNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
