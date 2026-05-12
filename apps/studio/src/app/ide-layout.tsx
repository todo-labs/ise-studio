import { useCallback, useEffect, useState } from "react";
import { FileCode, Loader2 } from "lucide-react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { IDEHeader } from "./components/ide-header";
import { useStudioWorkspace } from "./use-studio-workspace";
import { AIChat } from "@/features/ai-assistant";
import { CodeEditor } from "@/features/editor";
import { FileExplorer } from "@/features/project-explorer";
import { PreviewPanel } from "@/features/preview";
import type { EditorSelection } from "@/lib/ai-tools";
import type { ProjectMutation } from "@/lib/project";

export function IDELayout() {
  const workspace = useStudioWorkspace();
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [selection, setSelection] = useState<EditorSelection | null>(null);

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

  const handleProjectMutation = useCallback(
    (mutation: ProjectMutation) => {
      workspace.mutateActiveProject(mutation);
      if (mutation.type !== "update-file") {
        setSelection(null);
      }
    },
    [workspace],
  );

  const handleSelectProject = useCallback(
    (projectId: string) => {
      workspace.selectProject(projectId);
      setSelection(null);
    },
    [workspace],
  );

  const handleCreateProject = useCallback(() => {
    workspace.createProject();
    setSelection(null);
  }, [workspace]);

  if (workspace.isLoadingProjects || !workspace.activeProject) {
    return (
      <div className="bg-background flex h-screen items-center justify-center text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex h-screen flex-col">
      <IDEHeader isChatOpen={isChatOpen} onToggleChat={() => setIsChatOpen((prev) => !prev)} />

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {isChatOpen && (
          <>
            <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
              <AIChat
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                project={workspace.activeProject}
                currentSelection={selection}
                onProjectMutation={handleProjectMutation}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}

        <ResizablePanel defaultSize={isChatOpen ? 75 : 100}>
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="flex h-full min-w-0 flex-col">
                <FileExplorer
                  activeProject={workspace.activeProject}
                  activeProjectId={workspace.activeProjectId}
                  isSaving={workspace.isSavingProject}
                  onCreateProject={handleCreateProject}
                  onMutateProject={handleProjectMutation}
                  onSelectProject={handleSelectProject}
                  projects={workspace.projects}
                />
                <div className="min-h-0 flex-1">
                  {workspace.activeTextFile ? (
                    <CodeEditor
                      code={workspace.activeTextFile.content}
                      filePath={workspace.activeTextFile.path}
                      onCodeChange={(content) =>
                        handleProjectMutation({
                          type: "update-file",
                          path: workspace.activeTextFile!.path,
                          content,
                        })
                      }
                      onSelectionChange={setSelection}
                    />
                  ) : (
                    <AssetPlaceholder fileName={workspace.activeFile?.path ?? ""} />
                  )}
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={50} minSize={30}>
              <PreviewPanel
                entryPath={workspace.activeTextFile?.path ?? null}
                fileName={workspace.activeTextFile?.path ?? "main.scad"}
                files={workspace.activeProject.files}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function AssetPlaceholder({ fileName }: { fileName: string }) {
  return (
    <div className="bg-background flex h-full flex-col">
      <div className="flex flex-1 items-center justify-center p-6 text-center text-muted-foreground">
        <div className="max-w-sm space-y-3">
          <div className="bg-muted mx-auto flex h-14 w-14 items-center justify-center rounded-md">
            <FileCode className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-foreground text-sm font-medium">Asset files are mounted for imports</h3>
            <p className="mt-1 text-sm">
              Reference this file from a .scad file with import("{fileName}") or select a .scad file
              to edit and render.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
