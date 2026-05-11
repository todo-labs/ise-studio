import { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import type { Selection } from "monaco-editor";
import type * as Monaco from "monaco-editor";

import { useThemeMode } from "@/components/theme/theme-provider";

import type { EditorSelection } from "@/lib/ai-tools";
import { buildInstance } from "@/lib/openscad-monaco";

interface CodeEditorProps {
  code: string;
  onCodeChange: (content: string) => void;
  onSelectionChange?: (selection: EditorSelection | null) => void;
}

export function CodeEditor({ code, onCodeChange, onSelectionChange }: CodeEditorProps) {
  const editorRef = useRef<unknown>(null);
  const selectionDisposableRef = useRef<{ dispose: () => void } | null>(null);
  const { theme } = useThemeMode();

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
    return () => {
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
          theme={theme === "dark" ? "vs-dark" : "vs"}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: "on",
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
