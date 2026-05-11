import { OPENROUTER_PROVIDER, type AISettings } from "@/lib/ai-settings";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface SendAIMessageOptions {
  settings: AISettings;
  messages: ChatMessage[];
  currentCode?: string;
  useWebSearch?: boolean;
}

const systemPrompt =
  "You are ISE Studio's assistant. Help users write, debug, and explain OpenSCAD-style DSL code. Keep answers practical and include code when it helps.";

export async function sendAIMessage({
  settings,
  messages,
  currentCode,
  useWebSearch = false,
}: SendAIMessageOptions): Promise<string> {
  if (!settings.apiKey.trim()) {
    throw new Error(`Add your ${OPENROUTER_PROVIDER.name} API key in Settings first.`);
  }

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
      messages: [{ role: "system", content: buildSystemPrompt(currentCode) }, ...messages],
      temperature: 0.2,
      ...(useWebSearch ? { tools: [{ type: "openrouter:web_search" }] } : {}),
    }),
  });

  const data = (await response.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(
      `OpenRouter request failed (${response.status}): ${
        data?.error?.message ?? JSON.stringify(data) ?? response.statusText
      }`,
    );
  }

  return data?.choices?.[0]?.message?.content?.trim() || "No response content.";
}

function buildSystemPrompt(currentCode?: string) {
  if (!currentCode?.trim()) return systemPrompt;

  return `${systemPrompt}\n\nCurrent editor code:\n\`\`\`scad\n${currentCode}\n\`\`\``;
}
