import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { compileOpenSCADProject, terminateOpenSCAD, type CompileResult } from "@ise-studio/openscad";
import type { ProjectFile, ProjectTextFile } from "@ise-studio/project";

export type ExportStatus = "idle" | "exporting" | "saving" | "completed" | "error";

export interface ExportProgress {
  progress: number;
  statusText: string;
  status: ExportStatus;
}

export interface ExportSTLOperation {
  run: (onProgress: (progress: ExportProgress) => void) => Promise<void>;
}

interface PreviewWorkflowOptions {
  files: ProjectFile[];
  entryPath: string | null;
  fileName: string;
  autoPreview: boolean;
}

export function usePreviewWorkflow({
  files,
  entryPath,
  fileName,
  autoPreview,
}: PreviewWorkflowOptions) {
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geometryData, setGeometryData] = useState<Uint8Array | null>(null);
  const [geometryFormat, setGeometryFormat] = useState<"stl" | "off">("stl");
  const [showWireframe, setShowWireframe] = useState(false);
  const [lastCompiledAt, setLastCompiledAt] = useState<Date | null>(null);
  const [isWasmReady, setIsWasmReady] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const entryFile = useMemo(() => getEntryTextFile(files, entryPath), [entryPath, files]);
  const projectSources = useMemo(
    () => files.map((file) => ({ path: file.path, content: file.content })),
    [files],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      terminateOpenSCAD();
    };
  }, []);

  const renderPreview = useCallback(async () => {
    if (!entryFile?.content.trim()) {
      setError("Select a .scad file to compile");
      setGeometryData(null);
      return;
    }

    setIsCompiling(true);
    setError(null);

    try {
      const result: CompileResult = await compileOpenSCADProject({
        files: projectSources,
        entryPath: entryFile.path,
        format: "off",
        preview: true,
      });

      if (result.exitCode !== 0 && !result.geometry) {
        setError(result.stderr.trim() || `Compilation failed (exit code ${result.exitCode})`);
        setGeometryData(null);
        return;
      }

      if (!result.geometry) {
        setError("No geometry produced");
        setGeometryData(null);
        return;
      }

      setGeometryData(result.geometry);
      setGeometryFormat(result.format);
      setLastCompiledAt(new Date());
      setIsWasmReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compilation failed");
      setGeometryData(null);
    } finally {
      setIsCompiling(false);
    }
  }, [entryFile, projectSources]);

  useEffect(() => {
    if (!autoPreview || !entryFile?.content.trim()) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void renderPreview();
    }, 1500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [autoPreview, entryFile, renderPreview]);

  const exportSCAD = useCallback(() => {
    if (!entryFile?.content.trim()) {
      setError("Nothing to export");
      return;
    }

    try {
      const downloadName = fileName.endsWith(".scad") ? fileName : `${fileName}.scad`;
      downloadBlob(new Blob([entryFile.content], { type: "text/plain" }), downloadName);
      toast.success("SCAD file exported successfully", {
        description: `Saved as ${downloadName}`,
      });
    } catch {
      toast.error("Failed to export SCAD file");
    }
  }, [entryFile, fileName]);

  const exportSTLOperation = useMemo<ExportSTLOperation>(
    () => ({
      run: async (onProgress) => {
        if (!entryFile) {
          throw new Error("Select a .scad file before exporting STL.");
        }

        onProgress({ status: "exporting", progress: 0, statusText: "Rendering STL..." });
        const result = await compileOpenSCADProject({
          files: projectSources,
          entryPath: entryFile.path,
          format: "stl",
          onProgress: (progress, statusText) => {
            onProgress({
              status: "exporting",
              progress,
              statusText: `${statusText} (${progress}%)...`,
            });
          },
        });

        if (!result.geometry) {
          const errorDetail = result.stderr ? `\n\nDetails:\n${result.stderr}` : "";
          throw new Error(`No geometry produced (Exit code: ${result.exitCode})${errorDetail}`);
        }

        onProgress({ status: "saving", progress: 100, statusText: "Opening save dialog..." });
        const blob = new Blob([result.geometry.buffer as ArrayBuffer], {
          type: "application/octet-stream",
        });
        await saveSTLBlob(blob, fileName.replace(/\.scad$/, "") + ".stl");
      },
    }),
    [entryFile, fileName, projectSources],
  );

  return {
    canRender: Boolean(entryPath),
    canExport: Boolean(entryFile?.content.trim()),
    entryFile,
    error,
    exportSCAD,
    exportSTLOperation,
    geometryData,
    geometryFormat,
    isCompiling,
    isWasmReady,
    lastCompiledAt,
    renderPreview,
    setError,
    setShowWireframe,
    showWireframe,
  };
}

function getEntryTextFile(files: ProjectFile[], entryPath: string | null): ProjectTextFile | null {
  const file = files.find((item) => item.path === entryPath);
  return file?.kind === "scad" ? file : null;
}

function downloadBlob(blob: Blob, downloadName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = downloadName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function saveSTLBlob(blob: Blob, downloadName: string) {
  if ("showSaveFilePicker" in window) {
    try {
      const handle = await (window as Window & {
        showSaveFilePicker: (options: unknown) => Promise<{
          createWritable: () => Promise<{
            write: (blob: Blob) => Promise<void>;
            close: () => Promise<void>;
          }>;
        }>;
      }).showSaveFilePicker({
        suggestedName: downloadName,
        types: [
          {
            description: "STL File",
            accept: { "application/octet-stream": [".stl"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      throw err;
    }
  }

  downloadBlob(blob, downloadName);
}
