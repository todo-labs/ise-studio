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

test("conversation usage reads AI SDK finish parts from direct agent messages", () => {
  expect(
    accumulateConversationUsage([
      {
        role: "assistant",
        parts: [
          { type: "finish-step", usage: { inputTokens: 12, outputTokens: 4 } },
          { type: "finish", totalUsage: { inputTokens: 20, outputTokens: 7 } },
        ],
      },
    ]),
  ).toEqual({ inputTokens: 20, outputTokens: 7, reasoningTokens: 0, cachedInputTokens: 0 });
});

test("conversation usage sums finish-step parts when no final total is present", () => {
  expect(
    accumulateConversationUsage([
      {
        parts: [
          { type: "finish-step", usage: { inputTokens: 12, outputTokens: 4 } },
          { type: "finish-step", usage: { inputTokens: 8, outputTokens: 3 } },
        ],
      },
    ]),
  ).toEqual({ inputTokens: 20, outputTokens: 7, reasoningTokens: 0, cachedInputTokens: 0 });
});
