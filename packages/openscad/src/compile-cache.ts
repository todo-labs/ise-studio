import type { OpenSCADExportFormat, OpenSCADProjectFile } from "./invocation";

const DB_NAME = "ise-studio-openscad-cache";
const DB_VERSION = 1;
const STORE_NAME = "geometry";
const CACHE_VERSION = "openscad-wasm-v1-off-stl";

interface GeometryCacheEntry {
  key: string;
  geometry: ArrayBuffer;
  format: OpenSCADExportFormat;
  createdAt: number;
}

export async function getCompileCacheKey(options: {
  files: OpenSCADProjectFile[];
  entryPath: string;
  format: OpenSCADExportFormat;
  preview: boolean;
}) {
  const contents = await Promise.all(
    options.files.map(async (file) => `${file.path}:${await contentToString(file.content)}`),
  );
  return hashString(
    JSON.stringify({
      version: CACHE_VERSION,
      entryPath: options.entryPath,
      format: options.format,
      preview: options.preview,
      files: contents,
    }),
  );
}

export async function readCachedGeometry(key: string): Promise<Uint8Array | null> {
  const store = await openStore("readonly");
  if (!store) return null;
  return new Promise((resolve) => {
    try {
      const request = store.get(key);
      request.onsuccess = () => {
        const entry = request.result as GeometryCacheEntry | undefined;
        resolve(entry?.geometry ? new Uint8Array(entry.geometry) : null);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function writeCachedGeometry(
  key: string,
  geometry: Uint8Array,
  format: OpenSCADExportFormat,
) {
  const store = await openStore("readwrite");
  if (!store) return;
  await new Promise<void>((resolve) => {
    try {
      const request = store.put({
        key,
        geometry: new Uint8Array(geometry).buffer as ArrayBuffer,
        format,
        createdAt: Date.now(),
      } satisfies GeometryCacheEntry);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function openStore(mode: IDBTransactionMode): Promise<IDBObjectStore | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
  } catch {
    return null;
  }
}

async function contentToString(content: OpenSCADProjectFile["content"]) {
  if (typeof content === "string") return content;
  if (content instanceof Uint8Array) return new TextDecoder().decode(content);
  if (content instanceof ArrayBuffer) return new TextDecoder().decode(content);
  return new TextDecoder().decode(await content.arrayBuffer());
}

function hashString(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `${CACHE_VERSION}:${(hash >>> 0).toString(16)}`;
}
