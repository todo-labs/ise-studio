import { checkSyntax, compileOpenSCADProject, searchOpenSCADDocs } from "@ise-studio/openscad";
import {
  getOpenSCADLibraryAliases,
  getOpenSCADLibraryContext,
} from "@ise-studio/openscad";

type ToolArguments = Record<string, unknown>;

export interface EditorSelectionRange {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export interface EditorSelection {
  text: string;
  range: EditorSelectionRange;
}

interface ToolContext {
  currentCode?: string;
  selection?: EditorSelection | null;
}

export async function runLocalTool(toolName: string, rawArgs: string, context: ToolContext): Promise<string> {
  const args = parseToolArguments(rawArgs);

  switch (toolName) {
    case "validate_dsl":
      return JSON.stringify(await validateDsl(args, context), null, 2);
    case "inspect_scene":
      return JSON.stringify(await inspectScene(args, context), null, 2);
    case "search_docs":
      return JSON.stringify(await searchDocs(args), null, 2);
    case "apply_patch_to_selection":
      return JSON.stringify(applyPatchToSelection(args, context), null, 2);
    default:
      return JSON.stringify({ error: `Unsupported tool: ${toolName}` });
  }
}

async function validateDsl(args: ToolArguments, context: ToolContext) {
  const code = getRequestedCode(args, context);
  if (!code.trim()) {
    return { valid: false, error: "No code available to validate." };
  }

  try {
    const result = await checkSyntax(code, {
      files: [{ path: "main.scad", content: code }],
      entryPath: "main.scad",
    });
    return {
      valid: result.valid,
      errors: result.errors.length > 0 ? result.errors : null,
      stderr: result.stderr || null,
    };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Validation failed",
    };
  }
}

async function inspectScene(args: ToolArguments, context: ToolContext) {
  const code = getRequestedCode(args, context);
  if (!code.trim()) {
    return { valid: false, error: "No code available to inspect." };
  }

  try {
    const result = await compileOpenSCADProject({
      files: [{ path: "main.scad", content: code }],
      entryPath: "main.scad",
      format: "off",
      preview: true,
    });
    if (result.exitCode !== 0 || !result.geometry) {
      return {
        valid: false,
        error: result.stderr || `Render failed (exit code ${result.exitCode})`,
      };
    }

    const meshStats = analyzeOffGeometry(result.geometry);
    return {
      valid: true,
      exitCode: result.exitCode,
      format: result.format,
      geometrySize: result.geometry.length,
      mesh: meshStats,
      optimizationHints: getOptimizationHints(code),
      stdout: result.stdout || null,
      stderr: result.stderr || null,
    };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Inspection failed",
    };
  }
}

export function analyzeOffGeometry(data: Uint8Array) {
  try {
    const lines = new TextDecoder().decode(data).split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines[0]?.startsWith("OFF")) return null;
    let counts = lines[0].slice(3).trim();
    let offset = 1;
    if (!counts) counts = lines[offset++] ?? "";
    const [vertices = 0, faces = 0] = counts.split(/\s+/).map(Number);
    const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
    const points: number[][] = [];
    for (let index = 0; index < vertices; index += 1) {
      const point = lines[offset + index]?.split(/\s+/).slice(0, 3).map(Number) ?? [0, 0, 0];
      points.push(point);
      for (let axis = 0; axis < 3; axis += 1) {
        const value = point[axis] ?? 0;
        bounds.min[axis] = Math.min(bounds.min[axis]!, value);
        bounds.max[axis] = Math.max(bounds.max[axis]!, value);
      }
    }
    let overhangFaces = 0;
    let measuredFaces = 0;
    for (let index = offset + vertices; index < lines.length && measuredFaces < faces; index += 1) {
      const parts = lines[index]!.split(/\s+/).map(Number);
      const count = parts[0] ?? 0;
      if (count < 3) continue;
      const a = points[parts[1] ?? -1];
      const b = points[parts[2] ?? -1];
      const c = points[parts[3] ?? -1];
      if (!a || !b || !c) continue;
      const ab = [b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!];
      const ac = [c[0]! - a[0]!, c[1]! - a[1]!, c[2]! - a[2]!];
      const normalZ = ab[0]! * ac[1]! - ab[1]! * ac[0]!;
      const normalLength = Math.hypot(
        ab[1]! * ac[2]! - ab[2]! * ac[1]!,
        ab[2]! * ac[0]! - ab[0]! * ac[2]!,
        normalZ,
      );
      if (normalLength > 0 && normalZ / normalLength < -0.5) overhangFaces += 1;
      measuredFaces += 1;
    }
    const overhangRatio = measuredFaces ? overhangFaces / measuredFaces : 0;
    return {
      vertices,
      faces,
      bounds: vertices ? bounds : null,
      degenerate: faces === 0,
      printability: {
        overhangFaces,
        overhangRatio,
        overhangRisk: overhangRatio > 0.2 ? "high" : overhangRatio > 0.05 ? "moderate" : "low",
        wallThickness: "unavailable without a slicer or calibrated model scale",
      },
    };
  } catch {
    return null;
  }
}

function getOptimizationHints(code: string) {
  const hints: string[] = [];
  if (!/\$fn\s*=|\$fa\s*=|\$fs\s*=/.test(code)) hints.push("Set $fn, $fa, or $fs intentionally for predictable curved-surface resolution.");
  if (code.length > 20_000) hints.push("Consider moving repeated geometry into modules to reduce compile and context cost.");
  return hints;
}

async function searchDocs(args: ToolArguments) {
  const query = typeof args.query === "string" ? args.query.trim().toLowerCase() : "";
  const limit = clampNumber(args.limit, 1, 10) ?? 5;
  const scored = await searchOpenSCADDocs(query, limit);
  const libraryAliases = getOpenSCADLibraryAliases();

  return {
    query,
    bundledLibraries: {
      context: getOpenSCADLibraryContext(),
      aliases: libraryAliases,
    },
    results: scored.map(({ score: _score, ...entry }) => entry),
  };
}

function applyPatchToSelection(args: ToolArguments, context: ToolContext) {
  const replacement = typeof args.replacement === "string" ? args.replacement : "";
  if (!replacement.length) {
    return { applied: false, error: "Missing replacement code." };
  }

  const currentCode = context.currentCode ?? "";
  const selection = context.selection;

  if (!currentCode && !selection?.text) {
    return { applied: false, error: "No code available to patch." };
  }

  if (!selection || !isValidRange(selection.range) || !selection.text) {
    return {
      applied: true,
      scope: "document",
      updatedCode: replacement,
      changedRange: null,
    };
  }

  const updatedCode = replaceRange(currentCode, selection.range, replacement);
  return {
    applied: true,
    scope: selection.text ? "selection" : "cursor",
    updatedCode,
    changedRange: selection.range,
  };
}

function getRequestedCode(args: ToolArguments, context: ToolContext) {
  return typeof args.code === "string" && args.code.trim() ? args.code : context.currentCode ?? "";
}

function parseToolArguments(rawArgs: string): ToolArguments {
  if (!rawArgs.trim()) return {};
  try {
    return JSON.parse(rawArgs) as ToolArguments;
  } catch {
    return {};
  }
}

function clampNumber(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Math.min(max, Math.max(min, value));
}

function isValidRange(range: EditorSelectionRange | undefined): range is EditorSelectionRange {
  return Boolean(
    range &&
      Number.isInteger(range.startLineNumber) &&
      Number.isInteger(range.startColumn) &&
      Number.isInteger(range.endLineNumber) &&
      Number.isInteger(range.endColumn) &&
      range.startLineNumber >= 1 &&
      range.startColumn >= 1 &&
      range.endLineNumber >= range.startLineNumber &&
      range.endColumn >= 1,
  );
}

function replaceRange(code: string, range: EditorSelectionRange, replacement: string) {
  const startOffset = positionToOffset(code, range.startLineNumber, range.startColumn);
  const endOffset = positionToOffset(code, range.endLineNumber, range.endColumn);

  if (startOffset == null || endOffset == null || endOffset < startOffset) {
    return replacement;
  }

  return `${code.slice(0, startOffset)}${replacement}${code.slice(endOffset)}`;
}

function positionToOffset(text: string, lineNumber: number, column: number) {
  let currentLine = 1;
  let currentColumn = 1;

  for (let index = 0; index < text.length; index += 1) {
    if (currentLine === lineNumber && currentColumn === column) {
      return index;
    }

    const char = text[index];
    if (char === "\r") {
      if (text[index + 1] === "\n") {
        index += 1;
      }
      currentLine += 1;
      currentColumn = 1;
      continue;
    }

    if (char === "\n") {
      currentLine += 1;
      currentColumn = 1;
      continue;
    }

    currentColumn += 1;
  }

  if (currentLine === lineNumber && currentColumn === column) {
    return text.length;
  }

  return null;
}
