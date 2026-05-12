import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import type { Selection } from "monaco-editor";
import type * as Monaco from "monaco-editor";

import { useThemeMode } from "@ise-studio/ui/theme-provider";

import type { EditorSelection } from "@/lib/ai-tools";
import {
  EDITOR_SETTINGS_EVENT,
  loadEditorSettings,
  type EditorSettings,
} from "@/lib/editor-settings";
import { buildInstance } from "@/lib/openscad-monaco";
import { THEME_PRESETS } from "@ise-studio/ui/theme";

interface CodeEditorProps {
  code: string;
  filePath: string;
  onCodeChange: (content: string) => void;
  onSelectionChange?: (selection: EditorSelection | null) => void;
}

function registerEditorThemes(monacoInstance: typeof Monaco) {
  THEME_PRESETS.forEach((preset) => {
    const syntax = preset.editor.syntax;
    monacoInstance.editor.defineTheme(preset.monacoTheme, {
      base: preset.mode === "dark" ? "vs-dark" : "vs",
      inherit: true,
      rules: [
        { token: "keyword", foreground: syntax.keyword.replace("#", ""), fontStyle: "bold" },
        { token: "number", foreground: syntax.primitive.replace("#", "") },
        { token: "string", foreground: syntax.string.replace("#", "") },
        { token: "comment", foreground: syntax.comment.replace("#", ""), fontStyle: "italic" },
        { token: "type", foreground: syntax.type.replace("#", "") },
        { token: "operator", foreground: syntax.operator.replace("#", "") },
      ],
      colors: {
        "editor.background": preset.editor.background,
        "editor.foreground": preset.editor.foreground,
        "editor.lineHighlightBackground": preset.editor.lineHighlight,
        "editorLineNumber.foreground": syntax.comment,
        "editorCursor.foreground": preset.swatches.primary,
        "editor.selectionBackground": preset.editor.selection,
        "editor.inactiveSelectionBackground": preset.editor.lineHighlight,
        "editorIndentGuide.background1": preset.editor.selection,
        "editorIndentGuide.activeBackground1": preset.swatches.primary,
        "editorSuggestWidget.background": preset.editor.lineHighlight,
        "editorSuggestWidget.border": preset.editor.border,
        "editorSuggestWidget.selectedBackground": preset.editor.selection,
        "editorWidget.background": preset.editor.lineHighlight,
        focusBorder: preset.swatches.primary,
      },
    });
  });
}

export function CodeEditor({ code, filePath, onCodeChange, onSelectionChange }: CodeEditorProps) {
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
          path={filePath}
          value={code}
          onChange={(value) => {
            if (value !== undefined) {
              onCodeChange(value);
            }
          }}
          beforeMount={registerEditorThemes}
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
