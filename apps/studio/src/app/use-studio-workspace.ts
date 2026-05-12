import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
} from "@ise-studio/core/project";

export function useStudioWorkspace() {
  const [projects, setProjects] = useState<BrowserProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const didLoadProjectsRef = useRef(false);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null,
    [activeProjectId, projects],
  );
  const activeFile = activeProject ? getActiveFile(activeProject) : null;
  const activeTextFile = activeProject ? getActiveTextFile(activeProject) : null;

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
  }, [activeProjectId]);

  const selectProject = useCallback((projectId: string) => {
    setActiveProjectId(projectId);
    saveActiveProjectId(projectId);
  }, []);

  const createProject = useCallback(() => {
    const project = createDefaultProject();
    setProjects((previousProjects) => [...previousProjects, project]);
    setActiveProjectId(project.id);
    saveActiveProjectId(project.id);
    void saveProject(project);
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
