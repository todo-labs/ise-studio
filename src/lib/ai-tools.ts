import { compileOpenSCAD, checkSyntax } from "@/lib/openscad-runner";
import { searchOpenSCADDocs } from "@/lib/openscad-docs";

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

type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
      additionalProperties?: boolean;
    };
  };
};

interface ToolContext {
  currentCode?: string;
  selection?: EditorSelection | null;
}

export function getLocalToolDefinitions(): ToolDefinition[] {
  const tools: ToolDefinition[] = [
    {
      type: "function",
      function: {
        name: "validate_dsl",
        description:
          "Validate the current OpenSCAD code or a provided snippet by running a syntax check via the WASM engine.",
        parameters: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "Optional DSL source to validate. Defaults to the current editor code.",
            },
          },
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: "inspect_scene",
        description:
          "Compile the current OpenSCAD code via the WASM engine and return geometry metadata (size, format, render output).",
        parameters: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "Optional DSL source to inspect. Defaults to the current editor code.",
            },
          },
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: "search_docs",
        description: "Search the built-in OpenSCAD reference for syntax, examples, or usage patterns.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query or keywords.",
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return.",
              minimum: 1,
              maximum: 10,
            },
          },
          required: ["query"],
          additionalProperties: false,
        },
      },
    },
    {
      type: "function",
      function: {
        name: "apply_patch_to_selection",
        description:
          "Replace the current selection with new code, or replace the whole document when no selection exists.",
        parameters: {
          type: "object",
          properties: {
            replacement: {
              type: "string",
              description: "The code that should replace the current selection or document.",
            },
          },
          required: ["replacement"],
          additionalProperties: false,
        },
      },
    },
  ];

  return tools;
}

export async function runLocalTool(toolName: string, rawArgs: string, context: ToolContext): Promise<string> {
  const args = parseToolArguments(rawArgs);

  switch (toolName) {
    case "validate_dsl":
      return JSON.stringify(await validateDsl(args, context), null, 2);
    case "inspect_scene":
      return JSON.stringify(await inspectScene(args, context), null, 2);
    case "search_docs":
      return JSON.stringify(searchDocs(args), null, 2);
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
    const result = await checkSyntax(code);
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
    const result = await compileOpenSCAD(code, { format: "off", preview: true });
    if (result.exitCode !== 0 || !result.geometry) {
      return {
        valid: false,
        error: result.stderr || `Render failed (exit code ${result.exitCode})`,
      };
    }

    return {
      valid: true,
      exitCode: result.exitCode,
      format: result.format,
      geometrySize: result.geometry.length,
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

async function searchDocs(args: ToolArguments) {
  const query = typeof args.query === "string" ? args.query.trim().toLowerCase() : "";
  const limit = clampNumber(args.limit, 1, 10) ?? 5;
  const scored = await searchOpenSCADDocs(query, limit);

  return {
    query,
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
