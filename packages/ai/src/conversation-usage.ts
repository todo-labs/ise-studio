export interface ConversationUsage {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedInputTokens: number;
}

/** Normalizes AI SDK/OpenRouter usage shapes and accumulates a conversation. */
export function accumulateConversationUsage(messages: readonly unknown[]): ConversationUsage {
  return messages.reduce<ConversationUsage>(
    (total, message) => {
      const record = asRecord(message);
      const usage = asRecord(record?.usage) ?? asRecord(asRecord(record?.metadata)?.usage);
      if (!usage) return total;

      return {
        inputTokens: total.inputTokens + readTokenCount(usage, "inputTokens", "promptTokens"),
        outputTokens:
          total.outputTokens + readTokenCount(usage, "outputTokens", "completionTokens"),
        reasoningTokens:
          total.reasoningTokens +
          readNestedTokenCount(usage, "outputTokenDetails", "reasoningTokens", "reasoningTokens"),
        cachedInputTokens:
          total.cachedInputTokens +
          readNestedTokenCount(usage, "inputTokenDetails", "cacheReadTokens", "cachedInputTokens"),
      };
    },
    { inputTokens: 0, outputTokens: 0, reasoningTokens: 0, cachedInputTokens: 0 },
  );
}

function readTokenCount(record: Record<string, unknown>, primary: string, fallback: string) {
  const value = record[primary] ?? record[fallback];
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function readNestedTokenCount(
  record: Record<string, unknown>,
  parent: string,
  primary: string,
  fallback: string,
) {
  const nested = asRecord(record[parent]);
  return nested
    ? readTokenCount(nested, primary, fallback)
    : readTokenCount(record, primary, fallback);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
