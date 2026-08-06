import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { Experimental_Agent as ToolLoopAgent } from "ai";

import { type EditorSelection } from "./ai-tools";
import { createOpenRouterAssistantTools } from "./assistant-tool-registry";

export interface OpenRouterChatAgentContext {
  apiKey: string;
  model: string;
  useWebSearch?: boolean;
  getCurrentCode: () => string;
  getCurrentSelection: () => EditorSelection | null;
  onCodeChange: (code: string) => void;
}

export function createOpenRouterChatAgent({
  apiKey,
  model,
  useWebSearch = false,
  getCurrentCode,
  getCurrentSelection,
  onCodeChange,
}: OpenRouterChatAgentContext) {
  const provider = createOpenRouter({ apiKey });
  const modelSettings = useWebSearch
    ? { web_search_options: { max_results: 5 } }
    : undefined;

  return new ToolLoopAgent({
    model: provider.chat(model, modelSettings),
    instructions: buildSystemPrompt(getCurrentCode(), getCurrentSelection()),
    tools: createOpenRouterAssistantTools({
      getCurrentCode,
      getCurrentSelection,
      onCodeChange,
    }),
    prepareCall: async (options) => ({
      ...options,
      instructions: buildSystemPrompt(getCurrentCode(), getCurrentSelection()),
    }),
  });
}

function buildSystemPrompt(code: string, selection: EditorSelection | null) {
  const sections = [
    "You are ISE Studio's assistant. Help users write, debug, and explain OpenSCAD code. Keep answers practical and include code when it helps. Use validate_dsl for syntax problems, inspect_scene for preview or geometry issues, search_docs for DSL syntax and examples, and update_code or apply_patch_to_selection to apply changes. openrouter:web_search is available for current external references when needed.",
  ];

  if (code.trim()) {
    sections.push(`Current code:\n\`\`\`scad\n${code}\n\`\`\``);
  }

  if (selection?.text?.trim()) {
    sections.push(
      `Active selection:\n\`\`\`scad\n${selection.text}\n\`\`\`\nSelection range: ${selection.range.startLineNumber}:${selection.range.startColumn} -> ${selection.range.endLineNumber}:${selection.range.endColumn}`,
    );
  }

  return sections.join("\n\n");
}
