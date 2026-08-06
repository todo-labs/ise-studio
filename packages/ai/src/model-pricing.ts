export interface ModelPricing {
  /** USD per one million input tokens. */
  inputCost: number;
  /** USD per one million output tokens. */
  outputCost: number;
  /** Maximum context tokens, when published by the provider. */
  contextWindow?: number;
  /** Maximum output tokens, when published by the provider. */
  maxOutput?: number;
}

interface ModelsResponse {
  [provider: string]: {
    models?: Record<string, unknown>;
  };
}

interface ParsedModel {
  cost?: { input?: unknown; output?: unknown };
  limit?: { context?: unknown; output?: unknown };
}

const MODELS_API_URL = "https://models.dev/api.json";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let cachedData: ModelsResponse | null = null;
let cachedAt = 0;
let fetchInFlight: Promise<ModelsResponse | null> | null = null;

async function fetchModelsData(): Promise<ModelsResponse | null> {
  const now = Date.now();
  if (cachedData && now - cachedAt < CACHE_TTL_MS) return cachedData;
  if (fetchInFlight) return fetchInFlight;

  fetchInFlight = (async () => {
    try {
      const response = await fetch(MODELS_API_URL, {
        headers: { accept: "application/json" },
      });
      if (!response.ok) return cachedData;

      const parsed: unknown = await response.json();
      if (!isModelsResponse(parsed)) return cachedData;

      cachedData = parsed;
      cachedAt = Date.now();
      return cachedData;
    } catch {
      // A stale successful response is more useful than making chat fail when
      // the pricing service is temporarily unavailable.
      return cachedData;
    } finally {
      fetchInFlight = null;
    }
  })();

  return fetchInFlight;
}

export async function getModelPricing(openRouterModelId: string): Promise<ModelPricing | null> {
  const slashIndex = openRouterModelId.indexOf("/");
  if (slashIndex <= 0 || slashIndex === openRouterModelId.length - 1) return null;

  const providerId = openRouterModelId.slice(0, slashIndex);
  const modelId = openRouterModelId.slice(slashIndex + 1);
  const data = await fetchModelsData();
  const model = data?.[providerId]?.models?.[modelId];

  if (!isParsedModel(model) || !model.cost) return null;
  const inputCost = finiteNumber(model.cost.input);
  const outputCost = finiteNumber(model.cost.output);
  if (inputCost == null || outputCost == null) return null;

  return {
    inputCost,
    outputCost,
    contextWindow: positiveNumber(model.limit?.context),
    maxOutput: positiveNumber(model.limit?.output),
  };
}

export function calculateCost(
  pricing: ModelPricing,
  inputTokens: number,
  outputTokens: number,
): number {
  const input = Math.max(0, Number.isFinite(inputTokens) ? inputTokens : 0);
  const output = Math.max(0, Number.isFinite(outputTokens) ? outputTokens : 0);
  return (input * pricing.inputCost + output * pricing.outputCost) / 1_000_000;
}

/** Test/support hook for callers that need to discard an in-memory snapshot. */
export function clearModelPricingCache() {
  cachedData = null;
  cachedAt = 0;
  fetchInFlight = null;
}

function isModelsResponse(value: unknown): value is ModelsResponse {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isParsedModel(value: unknown): value is ParsedModel {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function finiteNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function positiveNumber(value: unknown) {
  const number = finiteNumber(value);
  return number && number > 0 ? number : undefined;
}
