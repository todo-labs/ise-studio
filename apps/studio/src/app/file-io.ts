import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { reverseEngineerSTL } from "@ise-studio/geometry";

export interface ImportedScadFile {
  code: string;
  fileName: string;
}

export interface PortableProject {
  code: string;
  fileName: string;
}

export interface ImportedSTLFile {
  code: string;
  fileName: string;
  analysis: ReturnType<typeof reverseEngineerSTL>;
}

export function buildCodeShareUrl(code: string) {
  const bytes = new TextEncoder().encode(code);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  const encoded = btoa(binary);
  return `${window.location.origin}${window.location.pathname}#code=${encodeURIComponent(encoded)}`;
}

export function decodeCodeShareHash(hash: string) {
  const encoded = hash.startsWith("#code=") ? decodeURIComponent(hash.slice("#code=".length)) : "";
  if (!encoded) return null;
  try {
    const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export async function importScadFile(): Promise<ImportedScadFile | null> {
  if ("showOpenFilePicker" in window) {
    try {
      const [handle] = await (
        window as Window & {
          showOpenFilePicker: (
            options: unknown,
          ) => Promise<Array<{ getFile: () => Promise<File> }>>;
        }
      ).showOpenFilePicker({
        multiple: false,
        types: [{ description: "OpenSCAD source", accept: { "text/plain": [".scad"] } }],
      });
      if (!handle) return null;
      const file = await handle.getFile();
      return { code: await file.text(), fileName: ensureScadExtension(file.name) };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return null;
      throw error;
    }
  }

  return await new Promise<ImportedScadFile | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".scad,text/plain";
    input.onchange = async () => {
      const file = input.files?.[0];
      resolve(file ? { code: await file.text(), fileName: ensureScadExtension(file.name) } : null);
    };
    input.click();
  });
}

export async function importSTLFile(): Promise<ImportedSTLFile | null> {
  const file = await chooseLocalFile(".stl,model/stl", "STL model");
  if (!file) return null;
  const analysis = reverseEngineerSTL(await file.arrayBuffer());
  return {
    code: analysis.code,
    fileName: `${file.name.replace(/\.stl$/i, "") || "reconstructed"}.scad`,
    analysis,
  };
}

export async function importProjectArchive(): Promise<PortableProject | null> {
  const file = await chooseLocalFile(".zip,application/zip", "Project archive");
  if (!file) return null;
  const archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const manifest = archive["ise-studio.json"];
  if (!manifest) throw new Error("This archive does not contain an ISE Studio document.");
  const parsed: unknown = JSON.parse(strFromU8(manifest));
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as PortableProject).code !== "string"
  ) {
    throw new Error("The ISE Studio archive manifest is invalid.");
  }
  const project = parsed as PortableProject;
  return { code: project.code, fileName: ensureScadExtension(project.fileName || "main.scad") };
}

export function exportProjectArchive(code: string, fileName: string) {
  downloadBytes(
    createProjectArchive(code, fileName),
    fileName.replace(/\.scad$/i, "") + ".ise.zip",
    "application/zip",
  );
}

export function createProjectArchive(code: string, fileName: string) {
  return zipSync({
    "ise-studio.json": strToU8(
      JSON.stringify({ version: 1, code, fileName: ensureScadExtension(fileName) }),
    ),
  });
}

export async function exportScadFile(code: string, fileName: string) {
  const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
  const downloadName = ensureScadExtension(fileName);
  if ("showSaveFilePicker" in window) {
    try {
      const handle = await (
        window as Window & {
          showSaveFilePicker: (options: unknown) => Promise<{
            createWritable: () => Promise<{
              write: (blob: Blob) => Promise<void>;
              close: () => Promise<void>;
            }>;
          }>;
        }
      ).showSaveFilePicker({
        suggestedName: downloadName,
        types: [{ description: "OpenSCAD source", accept: { "text/plain": [".scad"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      throw error;
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = downloadName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function ensureScadExtension(fileName: string) {
  return fileName.toLowerCase().endsWith(".scad") ? fileName : `${fileName}.scad`;
}

async function chooseLocalFile(accept: string, description: string) {
  if ("showOpenFilePicker" in window) {
    try {
      const [handle] = await (
        window as Window & {
          showOpenFilePicker: (
            options: unknown,
          ) => Promise<Array<{ getFile: () => Promise<File> }>>;
        }
      ).showOpenFilePicker({
        multiple: false,
        types: [{ description, accept: filePickerTypes(accept) }],
      });
      return handle ? await handle.getFile() : null;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return null;
      throw error;
    }
  }
  return await new Promise<File | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

function filePickerTypes(accept: string) {
  if (accept.includes(".stl")) return { "model/stl": [".stl"] };
  if (accept.includes(".zip")) return { "application/zip": [".zip"] };
  return { "text/plain": [".scad"] };
}

function downloadBytes(bytes: Uint8Array, fileName: string, mimeType: string) {
  const blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
