import { expect, test } from "bun:test";

import { calculateCost, clearModelPricingCache, getModelPricing } from "./model-pricing";

test("pricing parses provider data and calculates USD cost", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        openai: {
          models: {
            "gpt-test": {
              cost: { input: 2, output: 8 },
              limit: { context: 128000, output: 4096 },
            },
          },
        },
      }),
      { headers: { "content-type": "application/json" } },
    )) as typeof fetch;

  try {
    clearModelPricingCache();
    const pricing = await getModelPricing("openai/gpt-test");
    expect(pricing).toEqual({
      inputCost: 2,
      outputCost: 8,
      contextWindow: 128000,
      maxOutput: 4096,
    });
    expect(calculateCost(pricing!, 1_000_000, 500_000)).toBe(6);
  } finally {
    globalThis.fetch = originalFetch;
    clearModelPricingCache();
  }
});
