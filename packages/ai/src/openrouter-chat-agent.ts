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
  const modelSettings = useWebSearch ? { web_search_options: { max_results: 5 } } : undefined;

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
    [
      "You are ISE Studio's OpenSCAD and CAD assistant.",
      "The editor is the source of truth and already displays the user's code.",
      "Do not include OpenSCAD code, code blocks, or pasted full-document source in chat responses.",
      "When code needs to be created or changed, use update_code for a full-document replacement or apply_patch_to_selection for a focused edit; never ask the user to copy code from the chat into the editor.",
      "After changing code, use validate_dsl and inspect_scene when appropriate, then reply with a concise summary of what changed, validation status, and any actionable issue.",
      "For explanations, describe the relevant geometry, modules, parameters, and tradeoffs in prose without reproducing source code.",
      "Use search_docs for OpenSCAD syntax, library references, and examples; use openrouter:web_search only for current external references when needed.",
    ].join(" "),
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
