import { useCallback, useEffect, useRef, useState } from "react";
import { FileCode, Loader2 } from "lucide-react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { AIChat } from "./ai-chat";
import { CodeEditor } from "./code-editor";
import { FileExplorer } from "./file-explorer";
import { PreviewPanel } from "./preview-panel";
import { IDEHeader } from "./ide-header";
import type { EditorSelection } from "@/lib/ai-tools";
import {
  applyProjectMutation,
  createDefaultProject,
  getActiveFile,
  getActiveTextFile,
  loadProjects,
  saveActiveProjectId,
  saveProject,
  type BrowserProject,
  type ProjectMutation,
} from "@/lib/project";

export function IDELayout() {
  const [projects, setProjects] = useState<BrowserProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [selection, setSelection] = useState<EditorSelection | null>(null);
  const compileFunctionRef = useRef<(() => void) | null>(null);
  const didLoadProjectsRef = useRef(false);

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null;
  const activeFile = activeProject ? getActiveFile(activeProject) : null;
  const activeTextFile = activeProject ? getActiveTextFile(activeProject) : null;

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

  useEffect(() => {
    let cancelled = false;
    void loadProjects().then(({ projects: loadedProjects, activeProjectId: loadedActiveProjectId }) => {
      if (cancelled) return;
      setProjects(loadedProjects);
      setActiveProjectId(loadedActiveProjectId);
      setIsLoadingProjects(false);
      didLoadProjectsRef.current = true;
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!didLoadProjectsRef.current || !activeProject) return;
    setIsSavingProject(true);
    const timeout = setTimeout(() => {
      void saveProject(activeProject).finally(() => setIsSavingProject(false));
    }, 250);
    return () => {
      clearTimeout(timeout);
    };
  }, [activeProject]);

  const mutateActiveProject = useCallback((mutation: ProjectMutation) => {
    setProjects((previousProjects) =>
      previousProjects.map((project) =>
        project.id === activeProjectId ? applyProjectMutation(project, mutation) : project,
      ),
    );
    if (mutation.type !== "update-file") {
      setSelection(null);
    }
  }, [activeProjectId]);

  const selectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    saveActiveProjectId(projectId);
    setSelection(null);
  };

  const createProject = () => {
    const project = createDefaultProject();
    setProjects((previousProjects) => [...previousProjects, project]);
    setActiveProjectId(project.id);
    saveActiveProjectId(project.id);
    void saveProject(project);
    setSelection(null);
  };

  if (isLoadingProjects || !activeProject) {
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
      <IDEHeader isChatOpen={isChatOpen} onToggleChat={() => setIsChatOpen(!isChatOpen)} />

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* AI Chat - Conditionally rendered */}
        {isChatOpen && (
          <>
            <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
              <AIChat
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                project={activeProject}
                currentSelection={selection}
                onProjectMutation={(mutation) => {
                  mutateActiveProject(mutation);
                  setSelection(null);
                }}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}

        {/* Editor and Preview */}
        <ResizablePanel defaultSize={isChatOpen ? 75 : 100}>
          <ResizablePanelGroup direction="horizontal">
            {/* Code Editor */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="flex h-full min-w-0 flex-col">
                <FileExplorer
                  activeProject={activeProject}
                  activeProjectId={activeProjectId}
                  isSaving={isSavingProject}
                  onCreateProject={createProject}
                  onMutateProject={mutateActiveProject}
                  onSelectProject={selectProject}
                  projects={projects}
                />
                <div className="min-h-0 flex-1">
                  {activeTextFile ? (
                    <CodeEditor
                      code={activeTextFile.content}
                      filePath={activeTextFile.path}
                      onCodeChange={(content) =>
                        mutateActiveProject({
                          type: "update-file",
                          path: activeTextFile.path,
                          content,
                        })
                      }
                      onSelectionChange={setSelection}
                    />
                  ) : (
                    <AssetPlaceholder fileName={activeFile?.path ?? ""} />
                  )}
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* 3D Preview */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <PreviewPanel
                entryPath={activeTextFile?.path ?? null}
                fileName={activeTextFile?.path ?? "main.scad"}
                files={activeProject.files}
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
