import { expect, test } from "bun:test";

import {
  clearConversationMessages,
  CONVERSATION_STORAGE_KEY,
  loadConversationMessages,
  persistConversationMessages,
} from "./conversation-storage";

test("conversation messages persist and load from storage", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
  const messages = [
    { id: "1", role: "user" as const, parts: [{ type: "text" as const, text: "Hi" }] },
  ];

  expect(persistConversationMessages(messages, storage)).toBe(true);
  expect(values.has(CONVERSATION_STORAGE_KEY)).toBe(true);
  expect(loadConversationMessages(storage)).toEqual(messages);
});

test("conversation storage ignores malformed messages", () => {
  const values = new Map([[CONVERSATION_STORAGE_KEY, JSON.stringify([{ id: "missing-parts" }])]]);

  expect(loadConversationMessages({ getItem: (key: string) => values.get(key) ?? null })).toEqual(
    [],
  );
});

test("conversation storage can be cleared", () => {
  const values = new Map([[CONVERSATION_STORAGE_KEY, "saved"]]);

  expect(clearConversationMessages({ removeItem: (key: string) => void values.delete(key) })).toBe(
    true,
  );
  expect(values.has(CONVERSATION_STORAGE_KEY)).toBe(false);
});
