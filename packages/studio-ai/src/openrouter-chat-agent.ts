import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { Experimental_Agent as ToolLoopAgent, jsonSchema, tool } from "ai";

import { runLocalTool, type EditorSelection } from "./ai-tools";
import { getOpenSCADLibraryContext } from "@ise-studio/openscad";
import {
  type BrowserProject,
  type ProjectMutation,
  getActiveTextFile,
  getProjectFileKind,
  normalizeProjectPath,
} from "@ise-studio/project";

export interface OpenRouterChatAgentContext {
  apiKey: string;
  model: string;
  useWebSearch?: boolean;
  getCurrentProject: () => BrowserProject;
  getCurrentSelection: () => EditorSelection | null;
  onProjectMutation: (mutation: ProjectMutation) => void;
}

export function createOpenRouterChatAgent({
  apiKey,
  model,
  useWebSearch = false,
  getCurrentProject,
  getCurrentSelection,
  onProjectMutation,
}: OpenRouterChatAgentContext) {
  const provider = createOpenRouter({ apiKey });
  const modelSettings = useWebSearch
    ? { web_search_options: { max_results: 5 } }
    : undefined;

  return new ToolLoopAgent({
    model: provider.chat(model, modelSettings),
    instructions: buildSystemPrompt(getCurrentProject(), getCurrentSelection()),
    tools: {
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
        execute: async (args) => {
          return await executeLocalTool("validate_dsl", args, getCurrentProject, getCurrentSelection);
        },
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
        execute: async (args) => {
          return await executeLocalTool("inspect_scene", args, getCurrentProject, getCurrentSelection);
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
          return await executeLocalTool("search_docs", args, getCurrentProject, getCurrentSelection);
        },
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
          const project = getCurrentProject();
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
          const project = getCurrentProject();
          const file = project.files.find((item) => item.path === path);
          if (!file || file.kind !== "scad") {
            return { ok: false, error: `Editable .scad file not found: ${path}` };
          }
          onProjectMutation({ type: "update-file", path, content });
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
          onProjectMutation({ type: "create-file", path: normalizedPath, content: content ?? "" });
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
          onProjectMutation({ type: "rename-file", oldPath, newPath });
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
          onProjectMutation({ type: "delete-file", path });
          return { ok: true, path };
        },
      }),
    },
    prepareCall: async (options) => ({
      ...options,
      instructions: buildSystemPrompt(getCurrentProject(), getCurrentSelection()),
    }),
  });
}

function buildSystemPrompt(project: BrowserProject, selection: EditorSelection | null) {
  const activeFile = getActiveTextFile(project);
  const fileList = project.files
    .map((file) => `- ${file.path} (${file.kind}${file.path === project.activeFilePath ? ", active" : ""})`)
    .join("\n");
  const sections = [
    "You are ISE Studio's assistant. Help users write, debug, and explain OpenSCAD project code. Keep answers practical and include code when it helps. Use validate_dsl for syntax problems, inspect_scene for preview or geometry issues, search_docs for DSL syntax and examples, and the explicit project file tools to read, update, create, rename, or delete files. Asset files are importable but not text-editable. openrouter:web_search is available for current external references when needed.",
    getOpenSCADLibraryContext(),
    `Current project: ${project.name}\nActive file: ${project.activeFilePath}\nProject files:\n${fileList}`,
  ];

  if (activeFile?.content.trim()) {
    sections.push(`Active file code (${activeFile.path}):\n\`\`\`scad\n${activeFile.content}\n\`\`\``);
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
  getCurrentProject: () => BrowserProject,
  getCurrentSelection: () => EditorSelection | null,
) {
  return await runLocalTool(toolName, JSON.stringify(args), {
    project: getCurrentProject(),
    selection: getCurrentSelection(),
  });
}
