import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createDebouncedProjectSave,
  createWorkspaceProject,
  getStudioWorkspaceView,
  loadStudioWorkspace,
  mutateWorkspaceActiveProject,
  persistActiveWorkspaceProjectId,
  selectWorkspaceProject,
  saveProject,
  type ProjectMutation,
  type StudioWorkspace,
} from "@ise-studio/project";

export function useStudioWorkspace() {
  const [workspace, setWorkspace] = useState<StudioWorkspace>({ projects: [], activeProjectId: "" });
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const didLoadProjectsRef = useRef(false);
  const debouncedSaveRef = useRef(createDebouncedProjectSave(saveProject));

  const workspaceView = useMemo(() => getStudioWorkspaceView(workspace), [workspace]);
  const { projects, activeProjectId, activeProject, activeFile, activeTextFile } = workspaceView;

  useEffect(() => {
    let cancelled = false;
    void loadStudioWorkspace().then((loadedWorkspace) => {
      if (cancelled) return;
      setWorkspace(loadedWorkspace);
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
    debouncedSaveRef.current.schedule(activeProject, () => setIsSavingProject(false));
    return () => {
      debouncedSaveRef.current.cancel();
    };
  }, [activeProject]);

  const mutateActiveProject = useCallback((mutation: ProjectMutation) => {
    setWorkspace((previousWorkspace) => mutateWorkspaceActiveProject(previousWorkspace, mutation));
  }, []);

  const selectProject = useCallback((projectId: string) => {
    setWorkspace((previousWorkspace) => {
      const nextWorkspace = selectWorkspaceProject(previousWorkspace, projectId);
      persistActiveWorkspaceProjectId(nextWorkspace.activeProjectId);
      return nextWorkspace;
    });
  }, []);

  const createProject = useCallback(() => {
    setWorkspace((previousWorkspace) => {
      const next = createWorkspaceProject(previousWorkspace);
      persistActiveWorkspaceProjectId(next.project.id);
      void saveProject(next.project);
      return next.workspace;
    });
  }, []);

  return {
    projects,
    activeProjectId,
    activeProject,
    activeFile,
    activeTextFile,
    isLoadingProjects,
    isSavingProject,
    mutateActiveProject,
    selectProject,
    createProject,
  };
}
