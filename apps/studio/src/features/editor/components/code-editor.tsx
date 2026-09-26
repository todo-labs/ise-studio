import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import type { Selection } from "monaco-editor";
import type * as Monaco from "monaco-editor";

import { useThemeMode } from "@ise-studio/ui/theme-provider";

import type { EditorSelection } from "@ise-studio/ai";
import {
  EDITOR_SETTINGS_EVENT,
  loadEditorSettings,
  type EditorSettings,
  installOpenSCADMonaco,
} from "@ise-studio/editor";

interface CodeEditorProps {
  code: string;
  filePath: string;
  onCodeChange: (content: string) => void;
  onSelectionChange?: (selection: EditorSelection | null) => void;
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

    installOpenSCADMonaco(monacoInstance);
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
          beforeMount={installOpenSCADMonaco}
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
