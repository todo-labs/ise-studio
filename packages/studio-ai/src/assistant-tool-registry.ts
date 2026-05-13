import { jsonSchema, tool } from "ai";

import {
  getProjectFileKind,
  normalizeProjectPath,
  type BrowserProject,
  type ProjectMutation,
} from "@ise-studio/project";

import { runLocalTool, type EditorSelection } from "./ai-tools";

export interface AssistantToolRegistryContext {
  getCurrentProject: () => BrowserProject;
  getCurrentSelection: () => EditorSelection | null;
  onProjectMutation: (mutation: ProjectMutation) => void;
}

export function createOpenRouterAssistantTools(context: AssistantToolRegistryContext) {
  return {
    validate_dsl: tool({
      description:
        "Validate a project .scad file or provided snippet by running a syntax check via the WASM engine with all project files mounted.",
      inputSchema: jsonSchema<{ path?: string; code?: string }>({
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Optional project file path to validate. Defaults to the active .scad file.",
          },
          code: {
            type: "string",
            description: "Optional source to validate instead of the current contents at path.",
          },
        },
        additionalProperties: false,
      }),
      execute: async (args) => executeLocalTool("validate_dsl", args, context),
    }),
    inspect_scene: tool({
      description:
        "Compile a project .scad file via the WASM engine and return geometry metadata (size, format, render output).",
      inputSchema: jsonSchema<{ path?: string; code?: string }>({
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Optional project file path to inspect. Defaults to the active .scad file.",
          },
          code: {
            type: "string",
            description: "Optional source to inspect instead of the current contents at path.",
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
    read_project_file: tool({
      description: "Read a project file. Text .scad files return content; binary assets return metadata.",
      inputSchema: jsonSchema<{ path: string }>({
        type: "object",
        properties: {
          path: { type: "string", description: "Project file path to read." },
        },
        required: ["path"],
        additionalProperties: false,
      }),
      execute: async ({ path }) => {
        const project = context.getCurrentProject();
        const file = project.files.find((item) => item.path === path);
        if (!file) return { ok: false, error: `File not found: ${path}` };
        if (file.kind === "scad") return { ok: true, path: file.path, kind: file.kind, content: file.content };
        return { ok: true, path: file.path, kind: file.kind, size: file.content.size, type: file.content.type || null };
      },
    }),
    update_project_file: tool({
      description: "Replace the full contents of an existing .scad project file.",
      inputSchema: jsonSchema<{ path: string; content: string }>({
        type: "object",
        properties: {
          path: { type: "string", description: "Existing .scad file path." },
          content: {
            type: "string",
            description: "Full replacement contents for the .scad file.",
          },
        },
        required: ["path", "content"],
        additionalProperties: false,
      }),
      execute: async ({ path, content }) => {
        const project = context.getCurrentProject();
        const file = project.files.find((item) => item.path === path);
        if (!file || file.kind !== "scad") {
          return { ok: false, error: `Editable .scad file not found: ${path}` };
        }
        context.onProjectMutation({ type: "update-file", path, content });
        return { ok: true, path };
      },
    }),
    create_project_file: tool({
      description: "Create a new .scad project file and make it active.",
      inputSchema: jsonSchema<{ path: string; content?: string }>({
        type: "object",
        properties: {
          path: { type: "string", description: "New .scad file path." },
          content: { type: "string", description: "Initial file contents." },
        },
        required: ["path"],
        additionalProperties: false,
      }),
      execute: async ({ path, content }) => {
        const normalizedPath = normalizeProjectPath(path, ".scad");
        if (getProjectFileKind(normalizedPath) !== "scad") {
          return { ok: false, error: "AI-created editable files must use the .scad extension." };
        }
        context.onProjectMutation({ type: "create-file", path: normalizedPath, content: content ?? "" });
        return { ok: true, path: normalizedPath };
      },
    }),
    rename_project_file: tool({
      description: "Rename an existing project file. The extension must keep the same editable/asset type.",
      inputSchema: jsonSchema<{ oldPath: string; newPath: string }>({
        type: "object",
        properties: {
          oldPath: { type: "string" },
          newPath: { type: "string" },
        },
        required: ["oldPath", "newPath"],
        additionalProperties: false,
      }),
      execute: async ({ oldPath, newPath }) => {
        context.onProjectMutation({ type: "rename-file", oldPath, newPath });
        return { ok: true, oldPath, newPath };
      },
    }),
    delete_project_file: tool({
      description: "Delete a project file.",
      inputSchema: jsonSchema<{ path: string }>({
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
        additionalProperties: false,
      }),
      execute: async ({ path }) => {
        context.onProjectMutation({ type: "delete-file", path });
        return { ok: true, path };
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
    project: context.getCurrentProject(),
    selection: context.getCurrentSelection(),
  });
}
