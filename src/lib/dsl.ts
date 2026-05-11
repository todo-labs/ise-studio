import { BufferGeometry, MeshStandardMaterial, Vector3 } from "three";
import { MarchingCubes } from "three-stdlib";

export type Vec3 = [number, number, number];

interface DSLNodeBase {
  kind: "dsl";
  type: string;
}

export interface CubeNode extends DSLNodeBase {
  type: "cube";
  size: Vec3;
  center: boolean;
}

export interface SphereNode extends DSLNodeBase {
  type: "sphere";
  radius: number;
  center: boolean;
}

export interface CylinderNode extends DSLNodeBase {
  type: "cylinder";
  radiusTop: number;
  radiusBottom: number;
  height: number;
  center: boolean;
}

export interface UnionNode extends DSLNodeBase {
  type: "union" | "group";
  children: DSLNode[];
}

export interface DifferenceNode extends DSLNodeBase {
  type: "difference";
  children: DSLNode[];
}

export interface IntersectionNode extends DSLNodeBase {
  type: "intersection";
  children: DSLNode[];
}

export interface TranslateNode extends DSLNodeBase {
  type: "translate";
  offset: Vec3;
  child: DSLNode;
}

export interface RotateNode extends DSLNodeBase {
  type: "rotate";
  angles: Vec3;
  child: DSLNode;
}

export interface ScaleNode extends DSLNodeBase {
  type: "scale";
  factors: Vec3;
  child: DSLNode;
}

export interface ColorNode extends DSLNodeBase {
  type: "color";
  color: string;
  child: DSLNode;
}

export type DSLNode =
  | CubeNode
  | SphereNode
  | CylinderNode
  | UnionNode
  | DifferenceNode
  | IntersectionNode
  | TranslateNode
  | RotateNode
  | ScaleNode
  | ColorNode;

type DSLChildInput = DSLNode | DSLNode[] | (() => DSLNode) | null | undefined;

export interface EvaluateResult {
  node?: DSLNode;
  scadSource?: string;
  error?: string;
}

export interface GeometryOptions {
  resolution?: number;
  gridScale?: number;
}

export interface GeometryResult {
  geometry: BufferGeometry;
  gridScale: number;
}

const DEFAULT_VECTOR: Vec3 = [0, 0, 0];
const DEFAULT_SCALE_VECTOR: Vec3 = [1, 1, 1];
const DEFAULT_GRID_SCALE = 50;
const DEFAULT_RESOLUTION = 40;

interface CubeOptions {
  size?: number | Vec3;
  center?: boolean;
}

interface SphereOptions {
  r?: number;
  d?: number;
  center?: boolean;
}

interface CylinderOptions {
  h?: number;
  r?: number;
  d?: number;
  r1?: number;
  r2?: number;
  d1?: number;
  d2?: number;
  center?: boolean;
}

interface DSLApi {
  render(child: DSLChildInput): DSLNode;
  cube(options?: CubeOptions): DSLNode;
  sphere(options?: SphereOptions): DSLNode;
  cylinder(options?: CylinderOptions): DSLNode;
  union(...children: DSLChildInput[]): DSLNode;
  difference(...children: DSLChildInput[]): DSLNode;
  intersection(...children: DSLChildInput[]): DSLNode;
  group(...children: DSLChildInput[]): DSLNode;
  translate(offset: Vec3, child: DSLChildInput): DSLNode;
  rotate(angles: Vec3, child: DSLChildInput): DSLNode;
  scale(factors: number | Vec3, child: DSLChildInput): DSLNode;
  color(colorValue: string, child: DSLChildInput): DSLNode;
}

interface DSLRuntime {
  api: DSLApi;
  getResult: () => DSLNode | null;
}

export function evaluateDSL(code: string): EvaluateResult {
  const runtime = createDSLRuntime();
  try {
    // Provide the DSL helpers via destructuring to keep the user API close to OpenSCAD.
    const fn = new Function(
      "dsl",
      `"use strict";
const { render, cube, sphere, cylinder, union, difference, intersection, translate, rotate, scale, color, group } = dsl;
${code}`,
    );

    const returned = fn(runtime.api);
    const explicitResult = isDSLNode(returned) ? returned : null;
    const node = runtime.getResult() ?? explicitResult;

    if (!node) {
      throw new Error(
        "No model produced. Wrap your final shape with render(...) or return a DSL node.",
      );
    }

    return {
      node,
      scadSource: nodeToOpenSCAD(node),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to evaluate DSL code",
    };
  }
}

export function nodeToOpenSCAD(node: DSLNode, depth = 0): string {
  const pad = "  ".repeat(depth);

  switch (node.type) {
    case "cube": {
      const formatted = `[${formatNumber(node.size[0])}, ${formatNumber(node.size[1])}, ${formatNumber(node.size[2])}]`;
      return `${pad}cube(size=${formatted}, center=${node.center});`;
    }
    case "sphere": {
      const base = `sphere(r=${formatNumber(node.radius)});`;
      if (node.center) {
        return `${pad}${base}`;
      }
      const translate = `[0, 0, ${formatNumber(node.radius)}]`;
      return `${pad}translate(${translate}) ${base}`;
    }
    case "cylinder": {
      const top = formatNumber(node.radiusTop);
      const bottom = formatNumber(node.radiusBottom);
      return `${pad}cylinder(h=${formatNumber(node.height)}, r1=${bottom}, r2=${top}, center=${node.center});`;
    }
    case "union":
    case "group": {
      const body = node.children.map((child) => nodeToOpenSCAD(child, depth + 1)).join("\n");
      return `${pad}union() {\n${body}\n${pad}}`;
    }
    case "difference": {
      const body = node.children.map((child) => nodeToOpenSCAD(child, depth + 1)).join("\n");
      return `${pad}difference() {\n${body}\n${pad}}`;
    }
    case "intersection": {
      const body = node.children.map((child) => nodeToOpenSCAD(child, depth + 1)).join("\n");
      return `${pad}intersection() {\n${body}\n${pad}}`;
    }
    case "translate": {
      const offset = `[${formatNumber(node.offset[0])}, ${formatNumber(node.offset[1])}, ${formatNumber(node.offset[2])}]`;
      const body = nodeToOpenSCAD(node.child, depth + 1);
      return `${pad}translate(${offset}) {\n${body}\n${pad}}`;
    }
    case "rotate": {
      const angles = `[${formatNumber(node.angles[0])}, ${formatNumber(node.angles[1])}, ${formatNumber(node.angles[2])}]`;
      const body = nodeToOpenSCAD(node.child, depth + 1);
      return `${pad}rotate(${angles}) {\n${body}\n${pad}}`;
    }
    case "scale": {
      const factors = `[${formatNumber(node.factors[0])}, ${formatNumber(node.factors[1])}, ${formatNumber(node.factors[2])}]`;
      const body = nodeToOpenSCAD(node.child, depth + 1);
      return `${pad}scale(${factors}) {\n${body}\n${pad}}`;
    }
    case "color": {
      const body = nodeToOpenSCAD(node.child, depth + 1);
      return `${pad}color("${node.color}") {\n${body}\n${pad}}`;
    }
    default:
      throw new Error(`Unsupported node type: ${(node as DSLNode).type}`);
  }
}

export function buildGeometryFromDSL(node: DSLNode, options: GeometryOptions = {}): GeometryResult {
  const resolution = clampResolution(options.resolution ?? DEFAULT_RESOLUTION);
  const gridScale = options.gridScale ?? DEFAULT_GRID_SCALE;

  const material = new MeshStandardMaterial();
  const marcher = new MarchingCubes(resolution, material);
  marcher.isolation = 0;
  marcher.reset();

  const size = marcher.size;
  const size2 = marcher.size2;

  for (let z = 0; z < size; z++) {
    const zOffset = size2 * z;
    const fz = (z - marcher.halfsize) / marcher.halfsize;
    for (let y = 0; y < size; y++) {
      const yOffset = zOffset + size * y;
      const fy = (y - marcher.halfsize) / marcher.halfsize;
      for (let x = 0; x < size; x++) {
        const fx = (x - marcher.halfsize) / marcher.halfsize;
        const idx = yOffset + x;
        const point: Vec3 = [fx * gridScale, fy * gridScale, fz * gridScale];
        marcher.field[idx] = evaluateSDF(node, point);
      }
    }
  }

  marcher.update();

  const geometry = marcher.geometry.clone();
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  if (geometry.boundingBox) {
    const center = new Vector3();
    geometry.boundingBox.getCenter(center);
    if (!center.equals(new Vector3(0, 0, 0))) {
      geometry.translate(-center.x, -center.y, -center.z);
      geometry.computeBoundingSphere();
      geometry.computeBoundingBox();
    }
  }
  marcher.geometry.dispose();
  material.dispose();

  return {
    geometry,
    gridScale,
  };
}

function createDSLRuntime(): DSLRuntime {
  let root: DSLNode | null = null;
  let lastNode: DSLNode | null = null;

  const register = (node: DSLNode) => {
    lastNode = node;
    return node;
  };

  const ensureNode = (child: DSLChildInput, ctx: string): DSLNode => {
    if (typeof child === "function") {
      return ensureNode(child(), ctx);
    }
    if (Array.isArray(child)) {
      throw new Error(`${ctx} does not accept nested arrays directly`);
    }
    if (!isDSLNode(child)) {
      throw new Error(`${ctx} expected a DSL node`);
    }
    return child;
  };

  const collectNodes = (children: DSLChildInput[], ctx: string): DSLNode[] => {
    const result: DSLNode[] = [];
    for (const child of children) {
      if (!child) continue;
      if (Array.isArray(child)) {
        result.push(...collectNodes(child, ctx));
        continue;
      }
      if (typeof child === "function") {
        result.push(...collectNodes([child()], ctx));
        continue;
      }
      if (isDSLNode(child)) {
        result.push(child);
        continue;
      }
      throw new Error(`${ctx} only accepts DSL nodes`);
    }
    if (!result.length) {
      throw new Error(`${ctx} requires at least one child node`);
    }
    return result;
  };

  const api: DSLApi = {
    render(child: DSLChildInput) {
      const node = ensureNode(child, "render");
      root = node;
      return node;
    },
    cube(options: CubeOptions = {}) {
      const vec = toVec3(options.size ?? 1, [1, 1, 1]);
      return register({
        kind: "dsl",
        type: "cube",
        size: vec,
        center: options.center ?? false,
      });
    },
    sphere(options: SphereOptions = {}) {
      const radius = options.r ?? (options.d ? options.d / 2 : 1);
      if (!isFinite(radius) || radius <= 0) {
        throw new Error("sphere() requires a positive radius");
      }
      return register({
        kind: "dsl",
        type: "sphere",
        radius,
        center: options.center ?? true,
      });
    },
    cylinder(options: CylinderOptions = {}) {
      const height = options.h;
      if (!isFinite(height ?? NaN)) {
        throw new Error("cylinder() requires a height");
      }
      if (!height || height <= 0) {
        throw new Error("cylinder() height must be positive");
      }

      const top =
        options.r2 ??
        (options.d2 ? options.d2 / 2 : (options.r ?? (options.d ? options.d / 2 : undefined)));
      const bottom =
        options.r1 ??
        (options.d1 ? options.d1 / 2 : (options.r ?? (options.d ? options.d / 2 : undefined)));

      if (!isFinite(top ?? NaN) || !isFinite(bottom ?? NaN)) {
        throw new Error("cylinder() requires at least one radius or diameter");
      }

      if (top !== bottom) {
        throw new Error("Tapered cylinders are not supported yet");
      }

      const radius = top ?? bottom ?? 1;
      if (radius <= 0) {
        throw new Error("cylinder() radius must be positive");
      }

      return register({
        kind: "dsl",
        type: "cylinder",
        radiusTop: radius,
        radiusBottom: radius,
        height,
        center: options.center ?? false,
      });
    },
    union(...children: DSLChildInput[]) {
      return register({
        kind: "dsl",
        type: "union",
        children: collectNodes(children, "union"),
      });
    },
    difference(...children: DSLChildInput[]) {
      return register({
        kind: "dsl",
        type: "difference",
        children: collectNodes(children, "difference"),
      });
    },
    intersection(...children: DSLChildInput[]) {
      return register({
        kind: "dsl",
        type: "intersection",
        children: collectNodes(children, "intersection"),
      });
    },
    group(...children: DSLChildInput[]) {
      return register({
        kind: "dsl",
        type: "group",
        children: collectNodes(children, "group"),
      });
    },
    translate(offset: Vec3, child: DSLChildInput) {
      return register({
        kind: "dsl",
        type: "translate",
        offset: toVec3(offset, DEFAULT_VECTOR),
        child: ensureNode(child, "translate"),
      });
    },
    rotate(angles: Vec3, child: DSLChildInput) {
      return register({
        kind: "dsl",
        type: "rotate",
        angles: toVec3(angles, DEFAULT_VECTOR),
        child: ensureNode(child, "rotate"),
      });
    },
    scale(factors: number | Vec3, child: DSLChildInput) {
      const vector = sanitizeScale(toVec3(factors, DEFAULT_SCALE_VECTOR));
      return register({
        kind: "dsl",
        type: "scale",
        factors: vector,
        child: ensureNode(child, "scale"),
      });
    },
    color(colorValue: string, child: DSLChildInput) {
      if (typeof colorValue !== "string" || !colorValue.trim()) {
        throw new Error("color() requires a color string");
      }
      return register({
        kind: "dsl",
        type: "color",
        color: colorValue,
        child: ensureNode(child, "color"),
      });
    },
  };

  return {
    api,
    getResult: () => root ?? lastNode,
  };
}

function evaluateSDF(node: DSLNode, point: Vec3): number {
  switch (node.type) {
    case "cube":
      return sdfBox(point, node.size, node.center);
    case "sphere":
      return sdfSphere(point, node.radius, node.center);
    case "cylinder":
      return sdfCylinder(point, node.height, node.radiusTop, node.center);
    case "union":
    case "group":
      return node.children
        .map((child) => evaluateSDF(child, point))
        .reduce((min, val) => Math.min(min, val), Infinity);
    case "difference": {
      const [first, ...rest] = node.children;
      if (!first) return Infinity;
      let result = evaluateSDF(first, point);
      for (const child of rest) {
        result = Math.max(result, -evaluateSDF(child, point));
      }
      return result;
    }
    case "intersection":
      return node.children
        .map((child) => evaluateSDF(child, point))
        .reduce((max, val) => Math.max(max, val), -Infinity);
    case "translate": {
      const localPoint: Vec3 = [
        point[0] - node.offset[0],
        point[1] - node.offset[1],
        point[2] - node.offset[2],
      ];
      return evaluateSDF(node.child, localPoint);
    }
    case "rotate": {
      const local = applyInverseRotation(point, node.angles);
      return evaluateSDF(node.child, local);
    }
    case "scale": {
      const factors = node.factors;
      const local: Vec3 = [point[0] / factors[0], point[1] / factors[1], point[2] / factors[2]];
      const maxScale = Math.max(Math.abs(factors[0]), Math.abs(factors[1]), Math.abs(factors[2]));
      return evaluateSDF(node.child, local) * maxScale;
    }
    case "color":
      return evaluateSDF(node.child, point);
    default:
      return Infinity;
  }
}

function sdfSphere(point: Vec3, radius: number, center: boolean): number {
  const offset: Vec3 = center
    ? [point[0], point[1], point[2]]
    : [point[0], point[1], point[2] - radius];
  return length(offset) - radius;
}

function sdfBox(point: Vec3, size: Vec3, centered: boolean): number {
  const half: Vec3 = [size[0] / 2, size[1] / 2, size[2] / 2];
  const local: Vec3 = centered
    ? point
    : [point[0] - half[0], point[1] - half[1], point[2] - half[2]];
  const d: Vec3 = [
    Math.abs(local[0]) - half[0],
    Math.abs(local[1]) - half[1],
    Math.abs(local[2]) - half[2],
  ];
  const outside = [Math.max(d[0], 0), Math.max(d[1], 0), Math.max(d[2], 0)] as Vec3;
  const inside = Math.min(Math.max(d[0], Math.max(d[1], d[2])), 0);
  return length(outside) + inside;
}

function sdfCylinder(point: Vec3, height: number, radius: number, centered: boolean): number {
  const halfHeight = height / 2;
  const local: Vec3 = centered ? point : [point[0], point[1], point[2] - halfHeight];
  const d: [number, number] = [
    Math.hypot(local[0], local[1]) - radius,
    Math.abs(local[2]) - halfHeight,
  ];
  const outside = Math.min(Math.max(d[0], d[1]), 0);
  const radial: [number, number] = [Math.max(d[0], 0), Math.max(d[1], 0)];
  const inside = length2(radial);
  return outside + inside;
}

function applyInverseRotation(point: Vec3, angles: Vec3): Vec3 {
  const [rx, ry, rz] = angles.map((deg) => (deg * Math.PI) / 180) as Vec3;
  let x = point[0];
  let y = point[1];
  let z = point[2];

  if (rz !== 0) {
    const cos = Math.cos(-rz);
    const sin = Math.sin(-rz);
    const nx = x * cos - y * sin;
    const ny = x * sin + y * cos;
    x = nx;
    y = ny;
  }

  if (ry !== 0) {
    const cos = Math.cos(-ry);
    const sin = Math.sin(-ry);
    const nx = x * cos + z * sin;
    const nz = -x * sin + z * cos;
    x = nx;
    z = nz;
  }

  if (rx !== 0) {
    const cos = Math.cos(-rx);
    const sin = Math.sin(-rx);
    const ny = y * cos - z * sin;
    const nz = y * sin + z * cos;
    y = ny;
    z = nz;
  }

  return [x, y, z];
}

function toVec3(value: number | Vec3 | undefined, fallback: Vec3): Vec3 {
  if (typeof value === "number") {
    return [value, value, value] as Vec3;
  }
  if (Array.isArray(value)) {
    return [
      sanitizedNumber(value[0], fallback[0]),
      sanitizedNumber(value[1], fallback[1]),
      sanitizedNumber(value[2], fallback[2]),
    ] as Vec3;
  }
  return [fallback[0], fallback[1], fallback[2]] as Vec3;
}

function sanitizeScale(vec: Vec3): Vec3 {
  return [enforceScaleValue(vec[0]), enforceScaleValue(vec[1]), enforceScaleValue(vec[2])] as Vec3;
}

function enforceScaleValue(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  const abs = Math.abs(value);
  if (abs < 1e-4) {
    return value >= 0 ? 1e-4 : -1e-4;
  }
  return value;
}

function sanitizedNumber(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? (value as number) : fallback;
}

function length(vec: Vec3): number {
  return Math.hypot(vec[0], vec[1], vec[2]);
}

function length2(vec: [number, number]): number {
  return Math.hypot(vec[0], vec[1]);
}

function formatNumber(value: number): string {
  return Number(value.toFixed(4)).toString();
}

function isDSLNode(candidate: unknown): candidate is DSLNode {
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    (candidate as DSLNodeBase).kind === "dsl" &&
    typeof (candidate as DSLNodeBase).type === "string"
  );
}

function clampResolution(value: number): number {
  return Math.max(16, Math.min(64, Math.floor(value)));
}
