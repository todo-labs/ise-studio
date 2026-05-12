export type ProjectFileKind = "scad" | "asset";

export interface ProjectTextFile {
  path: string;
  kind: "scad";
  content: string;
}

export interface ProjectAssetFile {
  path: string;
  kind: "asset";
  content: Blob;
}

export type ProjectFile = ProjectTextFile | ProjectAssetFile;

export interface BrowserProject {
  id: string;
  name: string;
  activeFilePath: string;
  files: ProjectFile[];
  createdAt: number;
  updatedAt: number;
}

export type ProjectMutation =
  | { type: "set-active-file"; path: string }
  | { type: "update-file"; path: string; content: string }
  | { type: "create-file"; path: string; content?: string }
  | { type: "add-asset"; path: string; content: Blob }
  | { type: "rename-file"; oldPath: string; newPath: string }
  | { type: "duplicate-file"; sourcePath: string; targetPath: string }
  | { type: "delete-file"; path: string }
  | { type: "rename-project"; name: string };

export const SCAD_EXTENSIONS = [".scad"] as const;
export const ASSET_EXTENSIONS = [".stl", ".off", ".svg", ".dxf"] as const;
export const PROJECT_FILE_EXTENSIONS = [...SCAD_EXTENSIONS, ...ASSET_EXTENSIONS] as const;

const DEFAULT_CODE = `// OpenSCAD: hollow cube shell
difference() {
  cube([40, 40, 40], center=true);
  translate([0, 0, 4])
    cube([32, 32, 32], center=true);
}`;

export function createDefaultProject(): BrowserProject {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: "Untitled Project",
    activeFilePath: "main.scad",
    files: [{ path: "main.scad", kind: "scad", content: DEFAULT_CODE }],
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeProjectPath(input: string, fallbackExtension = ".scad") {
  const fileName = input
    .trim()
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean)
    .at(-1)
    ?.replace(/[<>:"|?*]/g, "-")
    .replaceAll(/\p{Cc}/gu, "-")
    .replace(/^\.+/, "")
    .trim();

  if (!fileName) return "";

  const hasExtension = /\.[A-Za-z0-9]+$/.test(fileName);
  return hasExtension ? fileName : `${fileName}${fallbackExtension}`;
}

export function getProjectFileKind(path: string): ProjectFileKind | null {
  const extension = getFileExtension(path);
  if (extension === ".scad") return "scad";
  if ((ASSET_EXTENSIONS as readonly string[]).includes(extension)) return "asset";
  return null;
}

export function getFileExtension(path: string) {
  const match = path.toLowerCase().match(/\.[^.]+$/);
  return match?.[0] ?? "";
}

export function ensureUniquePath(path: string, files: readonly ProjectFile[], ignorePath?: string) {
  const normalized = normalizeProjectPath(path, getFileExtension(path) || ".scad");
  if (!normalized) return "";

  const existing = new Set(
    files
      .filter((file) => file.path !== ignorePath)
      .map((file) => file.path.toLowerCase()),
  );
  if (!existing.has(normalized.toLowerCase())) return normalized;

  const extension = getFileExtension(normalized);
  const stem = extension ? normalized.slice(0, -extension.length) : normalized;
  let index = 2;
  let candidate = `${stem}-${index}${extension}`;
  while (existing.has(candidate.toLowerCase())) {
    index += 1;
    candidate = `${stem}-${index}${extension}`;
  }
  return candidate;
}

export function getActiveFile(project: BrowserProject) {
  return project.files.find((file) => file.path === project.activeFilePath) ?? project.files[0] ?? null;
}

export function getActiveTextFile(project: BrowserProject) {
  const active = getActiveFile(project);
  return active?.kind === "scad" ? active : null;
}

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
        project.activeFilePath === mutation.path ? (files.find((file) => file.kind === "scad") ?? files[0])?.path : project.activeFilePath;
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

const DB_NAME = "ise-studio-projects";
const DB_VERSION = 1;
const PROJECT_STORE = "projects";
const ACTIVE_PROJECT_KEY = "ise-studio-active-project-id";

function openProjectDb(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROJECT_STORE)) {
        db.createObjectStore(PROJECT_STORE, { keyPath: "id" });
      }
    };
    request.onerror = () => reject(request.error ?? new Error("Could not open project database."));
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await openProjectDb();
  return new Promise<T | undefined>((resolve, reject) => {
    const transaction = db.transaction(PROJECT_STORE, mode);
    const store = transaction.objectStore(PROJECT_STORE);
    const request = callback(store);

    if (request) {
      request.onerror = () => reject(request.error ?? new Error("Project database request failed."));
      request.onsuccess = () => resolve(request.result);
    } else {
      transaction.oncomplete = () => resolve(undefined);
    }

    transaction.onerror = () => reject(transaction.error ?? new Error("Project database transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Project database transaction aborted."));
  }).finally(() => db.close());
}

export async function loadProjects(): Promise<{ projects: BrowserProject[]; activeProjectId: string }> {
  const stored = await withStore<BrowserProject[]>("readonly", (store) => store.getAll());
  const projects = (stored ?? []).map(normalizeLoadedProject).filter(Boolean) as BrowserProject[];

  if (projects.length === 0) {
    const project = createDefaultProject();
    await saveProject(project);
    saveActiveProjectId(project.id);
    return { projects: [project], activeProjectId: project.id };
  }

  const storedActiveId = localStorage.getItem(ACTIVE_PROJECT_KEY);
  const activeProjectId = projects.some((project) => project.id === storedActiveId)
    ? storedActiveId!
    : projects[0]!.id;
  saveActiveProjectId(activeProjectId);
  return { projects, activeProjectId };
}

export async function saveProject(project: BrowserProject) {
  await withStore("readwrite", (store) => {
    store.put(project);
  });
}

export async function saveProjects(projects: BrowserProject[]) {
  await Promise.all(projects.map((project) => saveProject(project)));
}

export async function deleteStoredProject(projectId: string) {
  await withStore("readwrite", (store) => {
    store.delete(projectId);
  });
}

export function saveActiveProjectId(projectId: string) {
  localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
}

function normalizeLoadedProject(project: BrowserProject): BrowserProject | null {
  if (!project || !Array.isArray(project.files)) return null;
  const files = project.files
    .map((file) => {
      const path = normalizeProjectPath(file.path, getFileExtension(file.path) || ".scad");
      const kind = getProjectFileKind(path);
      if (!path || kind !== file.kind) return null;
      if (kind === "scad") {
        return { path, kind, content: typeof file.content === "string" ? file.content : "" };
      }
      return file.content instanceof Blob ? { path, kind, content: file.content } : null;
    })
    .filter(Boolean) as ProjectFile[];

  if (files.length === 0) files.push({ path: "main.scad", kind: "scad", content: "" });

  const activeFilePath = files.some((file) => file.path === project.activeFilePath)
    ? project.activeFilePath
    : files[0]!.path;

  return {
    id: project.id || crypto.randomUUID(),
    name: project.name || "Untitled Project",
    activeFilePath,
    files,
    createdAt: project.createdAt || Date.now(),
    updatedAt: project.updatedAt || Date.now(),
  };
}
