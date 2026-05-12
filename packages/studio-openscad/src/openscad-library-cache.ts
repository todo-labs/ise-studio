import { unzipSync } from "fflate";

import type { OpenSCADLibraryDefinition } from "./openscad-library-manifest";

const DB_NAME = "ise-studio-openscad-libraries";
const DB_VERSION = 1;
const STORE_NAME = "archives";

type StoredArchive = {
  name: string;
  bytes: Uint8Array;
};

export interface MountedOpenSCADLibrary {
  name: string;
  files: number;
}

export async function ensureOpenSCADLibraries(
  fs: any,
  libraries: OpenSCADLibraryDefinition[],
): Promise<MountedOpenSCADLibrary[]> {
  const mounted: MountedOpenSCADLibrary[] = [];
  await fs.mkdirTree("/libraries");

  for (const library of libraries) {
    const archive = await loadArchive(library);
    const extracted = unzipSync(archive.bytes);

    let fileCount = 0;
    for (const [rawPath, bytes] of Object.entries(extracted)) {
      const relativePath = normalizeArchivePath(rawPath, library.rootPrefix);
      if (!relativePath || !shouldKeepLibraryFile(relativePath, library)) continue;

      const normalizedPath = `/libraries/${library.name}/${relativePath}`;
      const parentDir = normalizedPath.slice(0, normalizedPath.lastIndexOf("/"));
      if (parentDir) {
        try {
          await fs.mkdirTree(parentDir);
        } catch {}
      }
      fs.writeFile(normalizedPath, bytes);
      fileCount += 1;
    }

    await createSymlinks(fs, library);
    mounted.push({ name: library.name, files: fileCount });
  }

  return mounted;
}

async function createSymlinks(fs: any, library: OpenSCADLibraryDefinition) {
  const symlinks = library.symlinks ?? { [library.name]: "." };
  for (const [alias, target] of Object.entries(symlinks)) {
    const sourcePath = target === "." ? `/libraries/${library.name}` : `/libraries/${library.name}/${target}`;
    const linkPath = `/${alias}`;
    try {
      await fs.symlink(sourcePath, linkPath);
    } catch {
      // Ignore already-created symlinks or files that exist from a prior run.
    }
  }
}

function shouldKeepLibraryFile(relativePath: string, library: OpenSCADLibraryDefinition) {
  const lower = relativePath.toLowerCase();
  if (lower.endsWith("/")) return false;
  if (lower.includes("/tests/") || lower.startsWith("tests/")) return false;

  const baseName = lower.split("/").pop() ?? "";
  if (baseName.startsWith("copying") || baseName.startsWith("license") || baseName.startsWith("readme")) {
    return true;
  }

  const allowedExt = library.includeExtensions.some((extension) => lower.endsWith(extension));
  if (!allowedExt) return false;

  const includePaths = library.includePaths ?? [];
  if (includePaths.length === 0) return true;
  return includePaths.some((prefix) => lower.startsWith(prefix.toLowerCase()));
}

function normalizeArchivePath(path: string, rootPrefix: string) {
  const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.endsWith("/")) return "";
  if (normalized.startsWith(rootPrefix + "/")) {
    return normalized.slice(rootPrefix.length + 1);
  }
  const parts = normalized.split("/");
  if (parts.length > 1) {
    return parts.slice(1).join("/");
  }
  return normalized;
}

async function loadArchive(library: OpenSCADLibraryDefinition): Promise<StoredArchive> {
  if (typeof indexedDB === "undefined") {
    throw new Error("OpenSCAD libraries require IndexedDB in the browser.");
  }

  const cached = await readArchiveFromDb(library.name);
  if (cached) return cached;

  let response: Response;
  try {
    response = await fetch(library.archiveUrl);
  } catch (error) {
    throw new Error(
      `Failed to fetch ${library.name} archive from ${library.archiveUrl}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch ${library.name} archive: ${response.status} ${response.statusText}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  await writeArchiveToDb(library.name, bytes);
  return { name: library.name, bytes };
}

async function openDb(): Promise<IDBDatabase> {
  return await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "name" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open library cache"));
  });
}

async function readArchiveFromDb(name: string): Promise<StoredArchive | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(name);
      request.onsuccess = () => resolve((request.result as StoredArchive | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error("Failed to read library cache"));
    });
  } catch {
    return null;
  }
}

async function writeArchiveToDb(name: string, bytes: Uint8Array) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ name, bytes });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to write library cache"));
    tx.onabort = () => reject(tx.error ?? new Error("Failed to write library cache"));
  });
}
