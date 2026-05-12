import {
  createDefaultProject,
  getFileExtension,
  getProjectFileKind,
  normalizeProjectPath,
  type BrowserProject,
  type ProjectFile,
} from "./model";

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
