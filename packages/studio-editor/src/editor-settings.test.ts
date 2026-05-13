import { expect, test } from "bun:test";

import { buildOpenSCADCompletionItems } from "./openscad-monaco";
import { normalizeEditorSettings } from "./editor-settings";

test("editor settings normalization clamps and defaults invalid values", () => {
  expect(
    normalizeEditorSettings({
      fontSize: 99,
      tabSize: 1,
      insertSpaces: "yes",
      wordWrap: "invalid",
      minimap: true,
      lineNumbers: "relative",
      renderWhitespace: "all",
      smoothScrolling: "no",
    }),
  ).toMatchObject({
    fontSize: 24,
    tabSize: 2,
    insertSpaces: true,
    wordWrap: "on",
    minimap: true,
    lineNumbers: "relative",
    renderWhitespace: "all",
    smoothScrolling: false,
  });
});

test("OpenSCAD completion generation includes primitives and bundled library snippets", () => {
  const monaco = {
    languages: {
      CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
      CompletionItemKind: { Function: 1, Module: 2, Reference: 3 },
    },
  };

  const completions = buildOpenSCADCompletionItems(monaco as never, {
    startLineNumber: 1,
    endLineNumber: 1,
    startColumn: 1,
    endColumn: 1,
  });

  expect(completions.some((item) => item.label === "cube")).toBe(true);
  expect(completions.some((item) => String(item.label).startsWith("include <BOSL2/"))).toBe(true);
});
