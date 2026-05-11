import { OPENROUTER_PROVIDER, type AISettings } from "@/lib/ai-settings";
import {
  type EditorSelection,
  getLocalToolDefinitions,
  runLocalTool,
} from "@/lib/ai-tools";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface SendAIMessageOptions {
  settings: AISettings;
  messages: ChatMessage[];
  currentCode?: string;
  selection?: EditorSelection | null;
  useWebSearch?: boolean;
  onCodeUpdate?: (code: string) => void;
}

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface AssistantMessage {
  role: "assistant";
  content?: string | null;
  tool_calls?: ToolCall[];
}

interface ToolMessage {
  role: "tool";
  tool_call_id: string;
  content: string;
}

type RequestMessage =
  | ChatMessage
  | AssistantMessage
  | ToolMessage
  | {
      role: "system";
      content: string;
    };

type OpenRouterTool =
  | {
      type: "function";
      function: {
        name: string;
        description: string;
        parameters: unknown;
      };
    }
  | {
      type: "openrouter:web_search";
      parameters?: Record<string, unknown>;
    };

const systemPrompt =
  "You are ISE Studio's assistant. Help users write, debug, and explain OpenSCAD-style DSL code. Keep answers practical and include code when it helps. Use validate_dsl for syntax problems, inspect_scene for preview or geometry issues, search_docs for DSL syntax and examples, apply_patch_to_selection to edit the active selection or the whole document when no selection is available, and openrouter:web_search for current external references when needed.";

export async function sendAIMessage({
  settings,
  messages,
  currentCode,
  selection,
  useWebSearch = false,
  onCodeUpdate,
}: SendAIMessageOptions): Promise<string> {
  if (!settings.apiKey.trim()) {
    throw new Error(`Add your ${OPENROUTER_PROVIDER.name} API key in Settings first.`);
  }

  let workingCode = currentCode ?? "";
  let workingSelection = selection ?? null;
  const requestMessages: RequestMessage[] = [
    { role: "system", content: buildSystemPromptWithSelection(workingCode, workingSelection) },
    ...messages,
  ];
  const tools: OpenRouterTool[] = [
    ...getLocalToolDefinitions(),
    ...(useWebSearch ? [{ type: "openrouter:web_search" as const }] : []),
  ];

  for (let iteration = 0; iteration < 8; iteration += 1) {
    requestMessages[0] = { role: "system", content: buildSystemPromptWithSelection(workingCode, workingSelection) };

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "ISE Studio",
      },
      body: JSON.stringify({
        model: settings.model,
        messages: requestMessages,
        temperature: 0.2,
        tools,
        parallel_tool_calls: false,
      }),
    });

    const data = (await response.json().catch(() => null)) as {
      choices?: { message?: AssistantMessage }[];
      error?: { message?: string };
    } | null;

    if (!response.ok) {
      throw new Error(
        `OpenRouter request failed (${response.status}): ${
          data?.error?.message ?? JSON.stringify(data) ?? response.statusText
        }`,
      );
    }

    const assistantMessage = data?.choices?.[0]?.message;
    if (!assistantMessage) {
      return "No response content.";
    }

    requestMessages.push(assistantMessage);

    const toolCalls = assistantMessage.tool_calls ?? [];
    if (!toolCalls.length) {
      return assistantMessage.content?.trim() || "No response content.";
    }

    for (const toolCall of toolCalls) {
      if (toolCall.type !== "function") continue;

      const toolResult = await runLocalTool(toolCall.function.name, toolCall.function.arguments, {
        currentCode: workingCode,
        selection: workingSelection,
      });

      if (toolCall.function.name === "apply_patch_to_selection") {
        const parsedResult = parseToolResult(toolResult);
        if (parsedResult?.updatedCode && typeof parsedResult.updatedCode === "string") {
          workingCode = parsedResult.updatedCode;
          workingSelection = null;
          onCodeUpdate?.(workingCode);
        }
      }

      requestMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: toolResult,
      });
    }
  }

  throw new Error("Tool loop exceeded the maximum iteration count.");
}

function buildSystemPromptWithSelection(currentCode?: string, selection?: EditorSelection | null) {
  const sections = [systemPrompt];

  if (currentCode?.trim()) {
    sections.push(`Current editor code:\n\`\`\`scad\n${currentCode}\n\`\`\``);
  }

  if (selection?.text?.trim()) {
    sections.push(
      `Active selection:\n\`\`\`scad\n${selection.text}\n\`\`\`\nSelection range: ${selection.range.startLineNumber}:${selection.range.startColumn} -> ${selection.range.endLineNumber}:${selection.range.endColumn}`,
    );
  }

  return sections.join("\n\n");
}

function parseToolResult(raw: string) {
  try {
    return JSON.parse(raw) as { updatedCode?: unknown } | null;
  } catch {
    return null;
  }
}
