import { expect, test } from "bun:test";

import { OPENROUTER_MODELS, OPENROUTER_PROVIDER } from "./ai-settings";

test("the curated CAD model catalog defaults to GPT-5.6 Luna", () => {
  expect(OPENROUTER_PROVIDER.defaultModel).toBe("openai/gpt-5.6-luna");
  expect(OPENROUTER_MODELS.some((model) => model.id === OPENROUTER_PROVIDER.defaultModel)).toBe(
    true,
  );
  expect(new Set(OPENROUTER_MODELS.map((model) => model.id)).size).toBe(OPENROUTER_MODELS.length);
});
