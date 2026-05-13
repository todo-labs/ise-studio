import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { Experimental_Agent as ToolLoopAgent } from "ai";

import { type EditorSelection } from "./ai-tools";
import { createOpenRouterAssistantTools } from "./assistant-tool-registry";
import { getOpenSCADLibraryContext } from "@ise-studio/openscad";
import { type BrowserProject, type ProjectMutation, getActiveTextFile } from "@ise-studio/project";

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
    tools: createOpenRouterAssistantTools({
      getCurrentProject,
      getCurrentSelection,
      onProjectMutation,
    }),
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
