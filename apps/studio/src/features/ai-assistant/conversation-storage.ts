import type { UIMessage } from "ai";

export const CONVERSATION_STORAGE_KEY = "ise-studio-ai-conversation";

export function loadConversationMessages<UI_MESSAGE extends UIMessage = UIMessage>(
  storage?: Pick<Storage, "getItem">,
): UI_MESSAGE[] {
  const source = storage ?? (typeof window === "undefined" ? undefined : window.localStorage);

  try {
    const parsed: unknown = JSON.parse(source?.getItem(CONVERSATION_STORAGE_KEY) ?? "null");
    return (Array.isArray(parsed) ? parsed.filter(isUIMessage) : []) as UI_MESSAGE[];
  } catch {
    return [];
  }
}

export function persistConversationMessages<UI_MESSAGE extends UIMessage>(
  messages: readonly UI_MESSAGE[],
  storage?: Pick<Storage, "setItem">,
): boolean {
  const target = storage ?? (typeof window === "undefined" ? undefined : window.localStorage);

  try {
    target?.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(messages));
    return Boolean(target);
  } catch (error) {
    console.error("Failed to save AI conversation:", error);
    return false;
  }
}

export function clearConversationMessages(storage?: Pick<Storage, "removeItem">): boolean {
  const target = storage ?? (typeof window === "undefined" ? undefined : window.localStorage);

  try {
    target?.removeItem(CONVERSATION_STORAGE_KEY);
    return Boolean(target);
  } catch (error) {
    console.error("Failed to clear AI conversation:", error);
    return false;
  }
}

function isUIMessage(value: unknown): value is UIMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<UIMessage>;
  return (
    typeof message.id === "string" &&
    (message.role === "user" || message.role === "assistant" || message.role === "system") &&
    Array.isArray(message.parts)
  );
}
