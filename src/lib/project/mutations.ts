import {
  createDefaultProject,
  ensureUniquePath,
  getProjectFileKind,
  type BrowserProject,
  type ProjectAssetFile,
  type ProjectFile,
  type ProjectTextFile,
} from "./model";

export type ProjectMutation =
  | { type: "set-active-file"; path: string }
  | { type: "update-file"; path: string; content: string }
  | { type: "create-file"; path: string; content?: string }
  | { type: "add-asset"; path: string; content: Blob }
  | { type: "rename-file"; oldPath: string; newPath: string }
  | { type: "duplicate-file"; sourcePath: string; targetPath: string }
  | { type: "delete-file"; path: string }
  | { type: "rename-project"; name: string };

export function applyProjectMutation(project: BrowserProject, mutation: ProjectMutation): BrowserProject {
  const updatedAt = Date.now();

  switch (mutation.type) {
    case "set-active-file": {
      if (!project.files.some((file) => file.path === mutation.path)) return project;
      return { ...project, activeFilePath: mutation.path, updatedAt };
    }
    case "update-file": {
      const files = project.files.map((file) =>
        file.path === mutation.path && file.kind === "scad"
          ? { ...file, content: mutation.content }
          : file,
      );
      return { ...project, files, updatedAt };
    }
    case "create-file": {
      const path = ensureUniquePath(mutation.path, project.files, undefined);
      if (!path || getProjectFileKind(path) !== "scad") return project;
      return {
        ...project,
        activeFilePath: path,
        files: [...project.files, { path, kind: "scad", content: mutation.content ?? "" }],
        updatedAt,
      };
    }
    case "add-asset": {
      const path = ensureUniquePath(mutation.path, project.files, undefined);
      if (!path || getProjectFileKind(path) !== "asset") return project;
      return {
        ...project,
        activeFilePath: path,
        files: [...project.files, { path, kind: "asset", content: mutation.content }],
        updatedAt,
      };
    }
    case "rename-file": {
      const targetKind = getProjectFileKind(mutation.newPath);
      const source = project.files.find((file) => file.path === mutation.oldPath);
      if (!source || targetKind !== source.kind) return project;

      const newPath = ensureUniquePath(mutation.newPath, project.files, mutation.oldPath);
      if (!newPath) return project;

      return {
        ...project,
        activeFilePath: project.activeFilePath === mutation.oldPath ? newPath : project.activeFilePath,
        files: project.files.map((file) =>
          file.path === mutation.oldPath ? { ...file, path: newPath } : file,
        ),
        updatedAt,
      };
    }
    case "duplicate-file": {
      const source = project.files.find((file) => file.path === mutation.sourcePath);
      if (!source) return project;
      const targetPath = ensureUniquePath(mutation.targetPath, project.files, undefined);
      if (!targetPath || getProjectFileKind(targetPath) !== source.kind) return project;
      const duplicate =
        source.kind === "scad"
          ? ({ path: targetPath, kind: "scad", content: source.content } satisfies ProjectTextFile)
          : ({ path: targetPath, kind: "asset", content: source.content } satisfies ProjectAssetFile);
      return {
        ...project,
        activeFilePath: targetPath,
        files: [...project.files, duplicate],
        updatedAt,
      };
    }
    case "delete-file": {
      if (project.files.length <= 1) return project;
      const files = project.files.filter((file) => file.path !== mutation.path);
      const activeFilePath =
        project.activeFilePath === mutation.path
          ? (files.find((file) => file.kind === "scad") ?? files[0])?.path
          : project.activeFilePath;
      return {
        ...project,
        activeFilePath: activeFilePath ?? "",
        files,
        updatedAt,
      };
    }
    case "rename-project":
      return { ...project, name: mutation.name.trim() || project.name, updatedAt };
    default:
      return project;
  }
}

export function createNewProject() {
  return createDefaultProject();
}
