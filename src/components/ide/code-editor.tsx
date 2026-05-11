import { useRef } from "react";
import Editor from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useThemeMode } from "@/components/theme/theme-provider";

import { buildInstance } from "@/lib/openscad-monaco";

interface CodeEditorProps {
  code: string;
  onCodeChange: (content: string) => void;
  onRender?: () => void;
}

export function CodeEditor({ code, onCodeChange, onRender }: CodeEditorProps) {
  const editorRef = useRef<unknown>(null);
  const { theme } = useThemeMode();

  const handleEditorDidMount = (
    editor: Monaco.editor.IStandaloneCodeEditor,
    monacoInstance: typeof Monaco,
  ) => {
    editorRef.current = editor;

    buildInstance(monacoInstance);

    try {
      const monacoEditor = editor as { focus?: () => void };
      setTimeout(() => {
        monacoEditor.focus?.();
      }, 100);
    } catch (error) {
      console.warn("Could not focus Monaco editor:", error);
    }
  };

  const handleRender = () => {
    if (onRender) {
      console.log("Render button clicked, calling onRender");
      onRender();
    } else {
      console.log("Render clicked but no onRender callback provided");
    }
  };

  return (
    <div className="bg-background flex h-full flex-col">
      {/* Editor Header */}
      <div className="bg-muted/30 flex items-center justify-between border-b p-2">
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            OpenSCAD
          </Badge>
        </div>

        <div className="flex items-center space-x-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button aria-label="Compile and preview" size="icon" variant="default" onClick={handleRender}>
                  <Play className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Compile and Preview</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

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
