import { useEffect, useRef, useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { AIChat } from "./ai-chat";
import { CodeEditor } from "./code-editor";
import { PreviewPanel } from "./preview-panel";
import { IDEHeader } from "./ide-header";

export function IDELayout() {
  const [code, setCode] = useState(`// DSL sample: create a hollow cube shell
render(
  difference(
    cube({ size: 40, center: true }),
    translate([0, 0, 4], cube({ size: 32, center: true }))
  )
);`);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const compileFunctionRef = useRef<(() => void) | null>(null);

  // Keyboard shortcut for toggling chat (Ctrl/Cmd + Shift + C)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === "C") {
        event.preventDefault();
        setIsChatOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="bg-background flex h-screen flex-col">
      <IDEHeader isChatOpen={isChatOpen} onToggleChat={() => setIsChatOpen(!isChatOpen)} />

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* AI Chat - Conditionally rendered */}
        {isChatOpen && (
          <>
            <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
              <AIChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} currentCode={code} />
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}

        {/* Editor and Preview */}
        <ResizablePanel defaultSize={isChatOpen ? 75 : 100}>
          <ResizablePanelGroup direction="horizontal">
            {/* Code Editor */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <CodeEditor
                code={code}
                onCodeChange={setCode}
                onRender={() => compileFunctionRef.current?.()}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* 3D Preview */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <PreviewPanel
                code={code}
                fileName="main.scad"
                onCompileReady={(compileFunction) => {
                  compileFunctionRef.current = compileFunction;
                }}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
