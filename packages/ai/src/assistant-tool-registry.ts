import { jsonSchema, tool } from "ai";

import { runLocalTool, type EditorSelection } from "./ai-tools";

export interface AssistantToolRegistryContext {
  getCurrentCode: () => string;
  getCurrentSelection: () => EditorSelection | null;
  onCodeChange: (code: string) => void;
}

export function createOpenRouterAssistantTools(context: AssistantToolRegistryContext) {
  return {
    validate_dsl: tool({
      description:
        "Validate the current OpenSCAD code by running a syntax check via the WASM engine.",
      inputSchema: jsonSchema<{ code?: string }>({
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "Optional source to validate instead of the current editor contents.",
          },
        },
        additionalProperties: false,
      }),
      execute: async (args) => executeLocalTool("validate_dsl", args, context),
    }),
    inspect_scene: tool({
      description:
        "Compile the current OpenSCAD code via the WASM engine and return geometry metadata (size, format, render output).",
      inputSchema: jsonSchema<{ code?: string }>({
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "Optional source to inspect instead of the current editor contents.",
          },
        },
        additionalProperties: false,
      }),
      execute: async (args) => executeLocalTool("inspect_scene", args, context),
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
      execute: async (args) => executeLocalTool("search_docs", args, context),
    }),
    update_code: tool({
      description: "Replace the entire OpenSCAD code in the editor with new content.",
      inputSchema: jsonSchema<{ code: string }>({
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "The complete new OpenSCAD code to set in the editor.",
          },
        },
        required: ["code"],
        additionalProperties: false,
      }),
      execute: async ({ code }) => {
        context.onCodeChange(code);
        return { ok: true };
      },
    }),
    apply_patch_to_selection: tool({
      description:
        "Replace the current editor selection with OpenSCAD code. If there is no selection, replace the whole document.",
      inputSchema: jsonSchema<{ replacement: string }>({
        type: "object",
        properties: {
          replacement: {
            type: "string",
            description: "The OpenSCAD code that should replace the active selection.",
          },
        },
        required: ["replacement"],
        additionalProperties: false,
      }),
      execute: async ({ replacement }) => {
        const result = await runLocalTool("apply_patch_to_selection", JSON.stringify({ replacement }), {
          currentCode: context.getCurrentCode(),
          selection: context.getCurrentSelection(),
        });
        const parsed = JSON.parse(result) as { applied?: boolean; updatedCode?: unknown };
        if (parsed.applied && typeof parsed.updatedCode === "string") {
          context.onCodeChange(parsed.updatedCode);
        }
        return parsed;
      },
    }),
  };
}

async function executeLocalTool(
  toolName: string,
  args: Record<string, unknown>,
  context: AssistantToolRegistryContext,
) {
  return await runLocalTool(toolName, JSON.stringify(args), {
    currentCode: context.getCurrentCode(),
    selection: context.getCurrentSelection(),
  });
}
