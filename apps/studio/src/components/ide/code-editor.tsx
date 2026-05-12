import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import type { Selection } from "monaco-editor";
import type * as Monaco from "monaco-editor";

import { useThemeMode } from "@/components/theme/theme-provider";

import type { EditorSelection } from "@/lib/ai-tools";
import {
  EDITOR_SETTINGS_EVENT,
  loadEditorSettings,
  type EditorSettings,
} from "@/lib/editor-settings";
import { buildInstance } from "@/lib/openscad-monaco";

interface CodeEditorProps {
  code: string;
  onCodeChange: (content: string) => void;
  onSelectionChange?: (selection: EditorSelection | null) => void;
}

function registerEditorThemes(monacoInstance: typeof Monaco) {
  monacoInstance.editor.defineTheme("ise-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "1f2937", fontStyle: "bold" },
      { token: "number", foreground: "0f766e" },
      { token: "string", foreground: "b45309" },
      { token: "comment", foreground: "6b7280", fontStyle: "italic" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#111827",
      "editorLineNumber.foreground": "#9ca3af",
      "editorCursor.foreground": "#111827",
      "editor.selectionBackground": "#dbeafe",
      "editor.inactiveSelectionBackground": "#e5e7eb",
    },
  });

  monacoInstance.editor.defineTheme("ise-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "e5e7eb", fontStyle: "bold" },
      { token: "number", foreground: "93c5fd" },
      { token: "string", foreground: "fcd34d" },
      { token: "comment", foreground: "9ca3af", fontStyle: "italic" },
    ],
    colors: {
      "editor.background": "#171717",
      "editor.foreground": "#f5f5f5",
      "editorLineNumber.foreground": "#737373",
      "editorCursor.foreground": "#f5f5f5",
      "editor.selectionBackground": "#374151",
      "editor.inactiveSelectionBackground": "#262626",
    },
  });

  monacoInstance.editor.defineTheme("ise-workbench", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "5eead4", fontStyle: "bold" },
      { token: "number", foreground: "facc15" },
      { token: "string", foreground: "fb923c" },
      { token: "comment", foreground: "94a3b8", fontStyle: "italic" },
    ],
    colors: {
      "editor.background": "#1a2530",
      "editor.foreground": "#e5eef7",
      "editorLineNumber.foreground": "#64748b",
      "editorCursor.foreground": "#5eead4",
      "editor.selectionBackground": "#245766",
      "editor.inactiveSelectionBackground": "#243746",
      "editorIndentGuide.background1": "#344858",
      "editorIndentGuide.activeBackground1": "#5eead4",
    },
  });
}

export function CodeEditor({ code, onCodeChange, onSelectionChange }: CodeEditorProps) {
  const editorRef = useRef<unknown>(null);
  const selectionDisposableRef = useRef<{ dispose: () => void } | null>(null);
  const { preset } = useThemeMode();
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(() => loadEditorSettings());

  const emitSelection = () => {
    const editor = editorRef.current as {
      getSelection?: () => Selection | null;
      getModel?: () => Monaco.editor.ITextModel | null;
    } | null;

    const selectionRange = editor?.getSelection?.();
    const model = editor?.getModel?.();
    if (!selectionRange || !model) {
      onSelectionChange?.(null);
      return;
    }

    onSelectionChange?.({
      text: model.getValueInRange(selectionRange),
      range: {
        startLineNumber: selectionRange.startLineNumber,
        startColumn: selectionRange.startColumn,
        endLineNumber: selectionRange.endLineNumber,
        endColumn: selectionRange.endColumn,
      },
    });
  };

  const handleEditorDidMount = (
    editor: Monaco.editor.IStandaloneCodeEditor,
    monacoInstance: typeof Monaco,
  ) => {
    editorRef.current = editor;
    selectionDisposableRef.current?.dispose();
    selectionDisposableRef.current = editor.onDidChangeCursorSelection(() => {
      emitSelection();
    });

    buildInstance(monacoInstance);
    registerEditorThemes(monacoInstance);
    emitSelection();

    try {
      const monacoEditor = editor as { focus?: () => void };
      setTimeout(() => {
        monacoEditor.focus?.();
      }, 100);
    } catch (error) {
      console.warn("Could not focus Monaco editor:", error);
    }
  };

  useEffect(() => {
    const handleEditorSettingsChange = (event: Event) => {
      const nextSettings = (event as CustomEvent<EditorSettings>).detail;
      setEditorSettings(nextSettings ?? loadEditorSettings());
    };

    window.addEventListener(EDITOR_SETTINGS_EVENT, handleEditorSettingsChange);

    return () => {
      window.removeEventListener(EDITOR_SETTINGS_EVENT, handleEditorSettingsChange);
      selectionDisposableRef.current?.dispose();
      selectionDisposableRef.current = null;
    };
  }, []);

  return (
    <div className="bg-background flex h-full flex-col">
      {/* Monaco Editor */}
      <div
        className="flex-1"
        onClick={() => {
          // Ensure editor gets focus when the container is clicked
          const editor = editorRef.current as { focus?: () => void } | null;
          editor?.focus?.();
        }}
      >
        <Editor
          height="100%"
          language="openscad"
          value={code}
          onChange={(value) => {
            if (value !== undefined) {
              onCodeChange(value);
            }
          }}
          onMount={handleEditorDidMount}
          theme={preset.monacoTheme}
          options={{
            minimap: { enabled: editorSettings.minimap },
            fontSize: editorSettings.fontSize,
            lineNumbers: editorSettings.lineNumbers,
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: editorSettings.tabSize,
            insertSpaces: editorSettings.insertSpaces,
            wordWrap: editorSettings.wordWrap,
            renderWhitespace: editorSettings.renderWhitespace,
            smoothScrolling: editorSettings.smoothScrolling,
            suggest: {
              showKeywords: true,
              showSnippets: true,
            },
            // Ensure clipboard operations work properly
            contextmenu: true,
            selectOnLineNumbers: true,
            readOnly: false,
            // Enable all standard editor features
            quickSuggestions: true,
            quickSuggestionsDelay: 100,
            parameterHints: {
              enabled: true,
            },
            // Ensure paste works
            acceptSuggestionOnCommitCharacter: true,
            acceptSuggestionOnEnter: "on",
            accessibilitySupport: "auto",
            autoIndent: "full",
            // Enable multiline paste
            multiCursorModifier: "ctrlCmd",
            // Allow drag and drop
            dragAndDrop: true,
            // Ensure focus behavior works correctly
            fixedOverflowWidgets: false,
          }}
        />
      </div>
    </div>
  );
}
