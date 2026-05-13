import { applyProjectMutation, type ProjectMutation } from "./mutations";
import {
  createDefaultProject,
  getActiveFile,
  getActiveTextFile,
  type BrowserProject,
} from "./model";
import {
  loadProjects,
  saveActiveProjectId,
  saveProject,
  type StoredProjects,
} from "./storage.browser";

export interface StudioWorkspace {
  projects: BrowserProject[];
  activeProjectId: string;
}

export interface StudioWorkspaceView extends StudioWorkspace {
  activeProject: BrowserProject | null;
  activeFile: ReturnType<typeof getActiveFile> | null;
  activeTextFile: ReturnType<typeof getActiveTextFile> | null;
}

export async function loadStudioWorkspace(): Promise<StudioWorkspace> {
  const stored: StoredProjects = await loadProjects();
  return {
    projects: stored.projects.map(ensureActiveFileFallback),
    activeProjectId: stored.activeProjectId,
  };
}

export function getStudioWorkspaceView(workspace: StudioWorkspace): StudioWorkspaceView {
  const activeProject = getActiveProject(workspace);

  return {
    ...workspace,
    activeProject,
    activeFile: activeProject ? getActiveFile(activeProject) : null,
    activeTextFile: activeProject ? getActiveTextFile(activeProject) : null,
  };
}

export function getActiveProject(workspace: StudioWorkspace): BrowserProject | null {
  return (
    workspace.projects.find((project) => project.id === workspace.activeProjectId) ??
    workspace.projects[0] ??
    null
  );
}

export function selectWorkspaceProject(workspace: StudioWorkspace, projectId: string): StudioWorkspace {
  const activeProjectId = workspace.projects.some((project) => project.id === projectId)
    ? projectId
    : workspace.projects[0]?.id ?? "";
  return { ...workspace, activeProjectId };
}

export function createWorkspaceProject(workspace: StudioWorkspace, project = createDefaultProject()) {
  return {
    project,
    workspace: {
      projects: [...workspace.projects, project],
      activeProjectId: project.id,
    } satisfies StudioWorkspace,
  };
}

export function mutateWorkspaceActiveProject(
  workspace: StudioWorkspace,
  mutation: ProjectMutation,
): StudioWorkspace {
  return {
    ...workspace,
    projects: workspace.projects.map((project) =>
      project.id === workspace.activeProjectId
        ? ensureActiveFileFallback(applyProjectMutation(project, mutation))
        : project,
    ),
  };
}

export function persistActiveWorkspaceProjectId(projectId: string) {
  saveActiveProjectId(projectId);
}

export function createDebouncedProjectSave(
  persistProject: (project: BrowserProject) => Promise<void> = saveProject,
  delayMs = 250,
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return {
    schedule(project: BrowserProject, onSettled?: () => void) {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        timeout = null;
        void persistProject(project).finally(onSettled);
      }, delayMs);
    },
    cancel() {
      if (!timeout) return;
      clearTimeout(timeout);
      timeout = null;
    },
  };
}

export function ensureActiveFileFallback(project: BrowserProject): BrowserProject {
  if (project.files.some((file) => file.path === project.activeFilePath)) return project;
  return {
    ...project,
    activeFilePath: (project.files.find((file) => file.kind === "scad") ?? project.files[0])?.path ?? "",
  };
}
