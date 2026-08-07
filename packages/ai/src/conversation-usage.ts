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
      const usage = getMessageUsage(record);
      if (!usage) return total;

      return addUsage(total, usage);
    },
    { inputTokens: 0, outputTokens: 0, reasoningTokens: 0, cachedInputTokens: 0 },
  );
}

function getMessageUsage(record: Record<string, unknown> | null) {
  if (!record) return null;

  const directUsage = asRecord(record.usage) ?? asRecord(asRecord(record.metadata)?.usage);
  if (directUsage) return directUsage;

  const parts = Array.isArray(record.parts) ? record.parts : [];
  const finishPart = parts
    .map(asRecord)
    .find((part) => part?.type === "finish" && asRecord(part.totalUsage));
  if (finishPart) return asRecord(finishPart.totalUsage);

  const stepUsages = parts
    .map(asRecord)
    .filter((part) => part?.type === "finish-step")
    .map((part) => asRecord(part?.usage))
    .filter((usage): usage is Record<string, unknown> => usage !== null);

  return stepUsages.length > 0 ? stepUsages.reduce(sumUsage, null) : null;
}

function addUsage(total: ConversationUsage, usage: Record<string, unknown>): ConversationUsage {
  return {
    inputTokens: total.inputTokens + readTokenCount(usage, "inputTokens", "promptTokens"),
    outputTokens: total.outputTokens + readTokenCount(usage, "outputTokens", "completionTokens"),
    reasoningTokens:
      total.reasoningTokens +
      readNestedTokenCount(usage, "outputTokenDetails", "reasoningTokens", "reasoningTokens"),
    cachedInputTokens:
      total.cachedInputTokens +
      readNestedTokenCount(usage, "inputTokenDetails", "cacheReadTokens", "cachedInputTokens"),
  };
}

function sumUsage(
  total: Record<string, unknown> | null,
  usage: Record<string, unknown>,
): Record<string, unknown> {
  if (!total) return { ...usage };

  return {
    inputTokens:
      readTokenCount(total, "inputTokens", "promptTokens") +
      readTokenCount(usage, "inputTokens", "promptTokens"),
    outputTokens:
      readTokenCount(total, "outputTokens", "completionTokens") +
      readTokenCount(usage, "outputTokens", "completionTokens"),
    outputTokenDetails: {
      reasoningTokens:
        readNestedTokenCount(total, "outputTokenDetails", "reasoningTokens", "reasoningTokens") +
        readNestedTokenCount(usage, "outputTokenDetails", "reasoningTokens", "reasoningTokens"),
    },
    inputTokenDetails: {
      cacheReadTokens:
        readNestedTokenCount(total, "inputTokenDetails", "cacheReadTokens", "cachedInputTokens") +
        readNestedTokenCount(usage, "inputTokenDetails", "cacheReadTokens", "cachedInputTokens"),
    },
  };
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
