import { RouterIcon } from "lucide-react";

export const AI_SETTINGS_EVENT = "ise-ai-settings-updated";

export const OPENROUTER_MODELS = [
  { id: "openrouter/auto", name: "Auto Router" },
  { id: "deepseek/deepseek-chat-v3.1", name: "DeepSeek V3.1" },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1" },
  { id: "z-ai/glm-5.1", name: "GLM 5.1" },
  { id: "moonshotai/kimi-k2", name: "Kimi K2" },
  { id: "anthropic/claude-opus-4.7", name: "Claude Opus 4.7" },
  { id: "anthropic/claude-sonnet-4.6", name: "Claude Sonnet 4.6" },
  { id: "openai/gpt-5.2-pro", name: "GPT-5.2 Pro" },
  { id: "openai/gpt-5.2-codex", name: "GPT-5.2 Codex" },
  { id: "google/gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview" },
] as const;

export const OPENROUTER_PROVIDER = {
  name: "OpenRouter",
  icon: RouterIcon,
  placeholder: "sk-or-...",
  keyName: "openrouter_api_key",
  modelKey: "openrouter_model",
  defaultModel: "openrouter/auto",
} as const;

export interface AISettings {
  apiKey: string;
  model: string;
}

export interface SaveAISettingsInput {
  apiKey: string;
}

export function loadAISettings(): AISettings {
  if (typeof window === "undefined") {
    return {
      apiKey: "",
      model: OPENROUTER_PROVIDER.defaultModel,
    };
  }

  return {
    apiKey: localStorage.getItem(OPENROUTER_PROVIDER.keyName) ?? "",
    model: localStorage.getItem(OPENROUTER_PROVIDER.modelKey) ?? OPENROUTER_PROVIDER.defaultModel,
  };
}

export function saveAISettings(settings: SaveAISettingsInput) {
  localStorage.setItem(OPENROUTER_PROVIDER.keyName, settings.apiKey);
  window.dispatchEvent(new Event(AI_SETTINGS_EVENT));
}

export function saveSelectedModel(model: string) {
  localStorage.setItem(OPENROUTER_PROVIDER.modelKey, model);
  window.dispatchEvent(new Event(AI_SETTINGS_EVENT));
}

export function clearAISettings() {
  localStorage.removeItem(OPENROUTER_PROVIDER.keyName);
  localStorage.removeItem(OPENROUTER_PROVIDER.modelKey);
  window.dispatchEvent(new Event(AI_SETTINGS_EVENT));
}
