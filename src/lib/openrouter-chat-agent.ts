import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { Experimental_Agent as ToolLoopAgent, jsonSchema, tool } from "ai";

import { runLocalTool, type EditorSelection } from "@/lib/ai-tools";

export interface OpenRouterChatAgentContext {
  apiKey: string;
  model: string;
  useWebSearch?: boolean;
  getCurrentCode: () => string;
  getCurrentSelection: () => EditorSelection | null;
  onCodeUpdate: (code: string) => void;
}

export function createOpenRouterChatAgent({
  apiKey,
  model,
  useWebSearch = false,
  getCurrentCode,
  getCurrentSelection,
  onCodeUpdate,
}: OpenRouterChatAgentContext) {
  const provider = createOpenRouter({ apiKey });
  const modelSettings = useWebSearch
    ? { web_search_options: { max_results: 5 } }
    : undefined;

  return new ToolLoopAgent({
    model: provider.chat(model, modelSettings),
    instructions: buildSystemPrompt(getCurrentCode(), getCurrentSelection()),
    tools: {
      validate_dsl: tool({
        description:
          "Validate the current OpenSCAD code or a provided snippet by running a syntax check via the WASM engine.",
        inputSchema: jsonSchema<{ code?: string }>({
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "Optional DSL source to validate. Defaults to the current editor code.",
            },
          },
          additionalProperties: false,
        }),
        execute: async (args) => {
          return await executeLocalTool("validate_dsl", args, getCurrentCode, getCurrentSelection);
        },
      }),
      inspect_scene: tool({
        description:
          "Compile the current OpenSCAD code via the WASM engine and return geometry metadata (size, format, render output).",
        inputSchema: jsonSchema<{ code?: string }>({
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "Optional DSL source to inspect. Defaults to the current editor code.",
            },
          },
          additionalProperties: false,
        }),
        execute: async (args) => {
          return await executeLocalTool("inspect_scene", args, getCurrentCode, getCurrentSelection);
        },
      }),
      search_docs: tool({
        description: "Search the built-in OpenSCAD reference for syntax, examples, or usage patterns.",
        inputSchema: jsonSchema<{ query: string; limit?: number }>({
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
        }),
        execute: async (args) => {
          return await executeLocalTool("search_docs", args, getCurrentCode, getCurrentSelection);
        },
      }),
      apply_patch_to_selection: tool({
        description:
          "Replace the current selection with new code, or replace the whole document when no selection exists.",
        inputSchema: jsonSchema<{ replacement: string }>({
          type: "object",
          properties: {
            replacement: {
              type: "string",
              description: "The code that should replace the current selection or document.",
            },
          },
          required: ["replacement"],
          additionalProperties: false,
        }),
        execute: async (args) => {
          const result = await executeLocalTool(
            "apply_patch_to_selection",
            args,
            getCurrentCode,
            getCurrentSelection,
          );
          const parsed = parseToolResult(result);
          if (parsed?.updatedCode && typeof parsed.updatedCode === "string") {
            onCodeUpdate(parsed.updatedCode);
          }
          return parsed ?? result;
        },
      }),
    },
    prepareCall: async (options) => ({
      ...options,
      instructions: buildSystemPrompt(getCurrentCode(), getCurrentSelection()),
    }),
  });
}

function buildSystemPrompt(currentCode: string, selection: EditorSelection | null) {
  const sections = [
    "You are ISE Studio's assistant. Help users write, debug, and explain OpenSCAD-style DSL code. Keep answers practical and include code when it helps. Use validate_dsl for syntax problems, inspect_scene for preview or geometry issues, search_docs for DSL syntax and examples, apply_patch_to_selection to edit the active selection or the whole document when no selection is available, and openrouter:web_search for current external references when needed.",
  ];

  if (currentCode.trim()) {
    sections.push(`Current editor code:\n\`\`\`scad\n${currentCode}\n\`\`\``);
  }

  if (selection?.text?.trim()) {
    sections.push(
      `Active selection:\n\`\`\`scad\n${selection.text}\n\`\`\`\nSelection range: ${selection.range.startLineNumber}:${selection.range.startColumn} -> ${selection.range.endLineNumber}:${selection.range.endColumn}`,
    );
  }

  return sections.join("\n\n");
}

async function executeLocalTool(
  toolName: string,
  args: Record<string, unknown>,
  getCurrentCode: () => string,
  getCurrentSelection: () => EditorSelection | null,
) {
  return await runLocalTool(toolName, JSON.stringify(args), {
    currentCode: getCurrentCode(),
    selection: getCurrentSelection(),
  });
}

function parseToolResult(raw: string) {
  try {
    return JSON.parse(raw) as { updatedCode?: unknown } | null;
  } catch {
    return null;
  }
}
