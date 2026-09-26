export const AI_SETTINGS_EVENT = "ise-ai-settings-updated";

/**
 * Curated for OpenSCAD/CAD work, ordered from lowest-cost daily driver to
 * higher-quality fallbacks. Prices and benchmark data are intentionally not
 * hard-coded here; ModelPricing reads the live OpenRouter catalog.
 *
 * There is not yet a stable public OpenSCAD leaderboard. The 3D design-arena
 * results exposed by OpenRouter are therefore a useful proxy, while the
 * actual product ranking should eventually come from our own compile-and-
 * geometry benchmark.
 */
export const OPENROUTER_MODELS = [
  { id: "deepseek/deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash" },
  { id: "openai/gpt-6-luna", name: "GPT-6 Luna" },
  { id: "z-ai/glm-5.3-flash", name: "GLM 5.3" },
  { id: "openrouter/auto", name: "Auto Router" },
] as const;

export const OPENROUTER_PROVIDER = {
  name: "OpenRouter",
  placeholder: "sk-or-...",
  keyName: "openrouter_api_key",
  modelKey: "openrouter_model",
  defaultModel: "openai/gpt-6-luna",
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
