export const EDITOR_SETTINGS_STORAGE_KEY = "ise-editor-settings";
export const EDITOR_SETTINGS_EVENT = "ise-editor-settings-change";

export type EditorLineNumbers = "on" | "off" | "relative";
export type EditorRenderWhitespace = "none" | "boundary" | "selection" | "all";
export type EditorWordWrap = "on" | "off" | "wordWrapColumn" | "bounded";

export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  insertSpaces: boolean;
  wordWrap: EditorWordWrap;
  minimap: boolean;
  lineNumbers: EditorLineNumbers;
  renderWhitespace: EditorRenderWhitespace;
  smoothScrolling: boolean;
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 14,
  tabSize: 2,
  insertSpaces: true,
  wordWrap: "on",
  minimap: false,
  lineNumbers: "on",
  renderWhitespace: "none",
  smoothScrolling: false,
};

const LINE_NUMBERS_VALUES: EditorLineNumbers[] = ["on", "off", "relative"];
const RENDER_WHITESPACE_VALUES: EditorRenderWhitespace[] = ["none", "boundary", "selection", "all"];
const WORD_WRAP_VALUES: EditorWordWrap[] = ["on", "off", "wordWrapColumn", "bounded"];

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function booleanOrDefault(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function enumOrDefault<T extends string>(value: unknown, allowed: T[], fallback: T) {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

export function normalizeEditorSettings(value: unknown): EditorSettings {
  const stored = value && typeof value === "object" ? (value as Partial<EditorSettings>) : {};

  return {
    fontSize: clampNumber(
      stored.fontSize,
      10,
      24,
      DEFAULT_EDITOR_SETTINGS.fontSize,
    ),
    tabSize: clampNumber(stored.tabSize, 2, 8, DEFAULT_EDITOR_SETTINGS.tabSize),
    insertSpaces: booleanOrDefault(stored.insertSpaces, DEFAULT_EDITOR_SETTINGS.insertSpaces),
    wordWrap: enumOrDefault(stored.wordWrap, WORD_WRAP_VALUES, DEFAULT_EDITOR_SETTINGS.wordWrap),
    minimap: booleanOrDefault(stored.minimap, DEFAULT_EDITOR_SETTINGS.minimap),
    lineNumbers: enumOrDefault(
      stored.lineNumbers,
      LINE_NUMBERS_VALUES,
      DEFAULT_EDITOR_SETTINGS.lineNumbers,
    ),
    renderWhitespace: enumOrDefault(
      stored.renderWhitespace,
      RENDER_WHITESPACE_VALUES,
      DEFAULT_EDITOR_SETTINGS.renderWhitespace,
    ),
    smoothScrolling: booleanOrDefault(
      stored.smoothScrolling,
      DEFAULT_EDITOR_SETTINGS.smoothScrolling,
    ),
  };
}

export function loadEditorSettings(): EditorSettings {
  if (typeof window === "undefined") {
    return DEFAULT_EDITOR_SETTINGS;
  }

  try {
    return normalizeEditorSettings(
      JSON.parse(window.localStorage.getItem(EDITOR_SETTINGS_STORAGE_KEY) ?? "{}"),
    );
  } catch {
    return DEFAULT_EDITOR_SETTINGS;
  }
}

export function saveEditorSettings(settings: EditorSettings) {
  if (typeof window === "undefined") return;

  const normalizedSettings = normalizeEditorSettings(settings);
  window.localStorage.setItem(EDITOR_SETTINGS_STORAGE_KEY, JSON.stringify(normalizedSettings));
  window.dispatchEvent(
    new CustomEvent<EditorSettings>(EDITOR_SETTINGS_EVENT, { detail: normalizedSettings }),
  );
}
