import { lazy, Suspense, useEffect } from "react";
import { toast } from "sonner";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@ise-studio/ui/resizable";
import { IDEHeader } from "./components/ide-header";
import { useSingleFile } from "./use-studio-workspace";
import { CodeEditor, LibraryBrowser, VisualBlocksPanel } from "@/features/editor";
import { ErrorBoundary } from "./components/error-boundary";
import { CommandPalette } from "./components/command-palette";
import { exportScadFile } from "./file-io";
import { EXPORT_SCAD_EVENT } from "@ise-studio/ui/studio-events";
import { useStudioHistory } from "./use-studio-history";
import { HistoryPanel } from "./components/history-panel";
import { useStudioLayoutStore } from "./studio-layout-store";

const AIChat = lazy(() =>
  import("@/features/ai-assistant").then((module) => ({ default: module.AIChat })),
);
const PreviewPanel = lazy(() =>
  import("@/features/preview").then((module) => ({ default: module.PreviewPanel })),
);

export function IDELayout() {
  const { code, setCode } = useSingleFile();
  const { fileName, isChatOpen, selection, setFileName, setSelection, toggleChat } =
    useStudioLayoutStore();
  const { entries, record } = useStudioHistory(code);

  useEffect(() => {
    const exportSource = () => {
      void exportScadFile(code, fileName).catch((error) => {
        toast.error("Could not export the SCAD file", {
          description: error instanceof Error ? error.message : "File access failed.",
        });
      });
    };
    window.addEventListener(EXPORT_SCAD_EVENT, exportSource);
    return () => window.removeEventListener(EXPORT_SCAD_EVENT, exportSource);
  }, [code, fileName]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === "C") {
        event.preventDefault();
        toggleChat();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleChat]);

  return (
    <div className="bg-background flex h-screen flex-col">
      <IDEHeader isChatOpen={isChatOpen} onToggleChat={toggleChat} />

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {isChatOpen && (
          <>
            <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
              <ErrorBoundary name="AI assistant">
                <Suspense
                  fallback={
                    <div className="text-muted-foreground grid h-full place-items-center text-sm">
                      Loading assistant…
                    </div>
                  }
                >
                  <AIChat
                    isOpen={isChatOpen}
                    onClose={() => useStudioLayoutStore.getState().setIsChatOpen(false)}
                    code={code}
                    currentSelection={selection}
                    onCodeChange={setCode}
                  />
                </Suspense>
              </ErrorBoundary>
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}

        <ResizablePanel defaultSize={isChatOpen ? 75 : 100}>
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="flex h-full min-w-0 flex-col">
                <div className="min-h-0 flex-1">
                  <ErrorBoundary name="Editor">
                    <CodeEditor
                      code={code}
                      filePath={fileName}
                      onCodeChange={setCode}
                      onSelectionChange={setSelection}
                    />
                  </ErrorBoundary>
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={50} minSize={30}>
              <ErrorBoundary name="Preview">
                <Suspense
                  fallback={
                    <div className="text-muted-foreground grid h-full place-items-center text-sm">
                      Loading preview…
                    </div>
                  }
                >
                  <PreviewPanel
                    fileName={fileName}
                    code={code}
                    onCodeChange={setCode}
                    onSuccessfulCompile={() => record(code, "preview")}
                  />
                </Suspense>
              </ErrorBoundary>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>

      <HistoryPanel entries={entries} onRestore={setCode} />

      <CommandPalette
        code={code}
        fileName={fileName}
        onCodeChange={setCode}
        onFileNameChange={setFileName}
      />
      <LibraryBrowser code={code} onCodeChange={setCode} />
      <VisualBlocksPanel onCodeChange={setCode} />
    </div>
  );
}
