import { expect, test } from "bun:test";

import { accumulateConversationUsage } from "./conversation-usage";

test("conversation usage supports current and legacy AI SDK token fields", () => {
  expect(
    accumulateConversationUsage([
      { usage: { inputTokens: 12, outputTokens: 4 } },
      { usage: { promptTokens: 8, completionTokens: 3 } },
      { metadata: { usage: { inputTokens: 2, outputTokens: 1 } } },
    ]),
  ).toEqual({ inputTokens: 22, outputTokens: 8, reasoningTokens: 0, cachedInputTokens: 0 });
});

test("conversation usage preserves reasoning and cached input tokens", () => {
  expect(
    accumulateConversationUsage([
      {
        usage: {
          inputTokens: 100,
          inputTokenDetails: { cacheReadTokens: 40 },
          outputTokens: 20,
          outputTokenDetails: { reasoningTokens: 6 },
        },
      },
    ]),
  ).toEqual({ inputTokens: 100, outputTokens: 20, reasoningTokens: 6, cachedInputTokens: 40 });
});
