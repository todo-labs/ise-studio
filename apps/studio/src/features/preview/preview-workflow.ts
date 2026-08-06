import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  compileOpenSCADProject,
  type CompileResult,
  type OpenSCADProjectFile,
} from "@ise-studio/openscad";

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
  source: OpenSCADProjectFile;
  fileName: string;
  autoPreview: boolean;
}

export function usePreviewWorkflow({ source, fileName, autoPreview }: PreviewWorkflowOptions) {
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geometryData, setGeometryData] = useState<Uint8Array | null>(null);
  const [geometryFormat, setGeometryFormat] = useState<"stl" | "off">("off");
  const [showWireframe, setShowWireframe] = useState(false);
  const [lastCompiledAt, setLastCompiledAt] = useState<Date | null>(null);
  const [isWasmReady, setIsWasmReady] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const compileControllerRef = useRef<AbortController | null>(null);

  const sources = useMemo(() => [source], [source]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      compileControllerRef.current?.abort();
    };
  }, []);

  const renderPreview = useCallback(async () => {
    if (typeof source.content !== "string" || !source.content.trim()) {
      setError("Enter OpenSCAD code to compile.");
      return;
    }

    compileControllerRef.current?.abort();
    const controller = new AbortController();
    compileControllerRef.current = controller;
    setIsCompiling(true);
    setError(null);

    try {
      const result: CompileResult = await compileOpenSCADProject({
        files: sources,
        entryPath: source.path,
        format: "off",
        preview: true,
        signal: controller.signal,
      });

      if (result.exitCode !== 0 || !result.geometry) {
        setError(result.stderr.trim() || `Compilation failed (exit code ${result.exitCode})`);
        return;
      }

      // Keep the last successful geometry visible when a later edit fails.
      setGeometryData(result.geometry);
      setGeometryFormat(result.format);
      setLastCompiledAt(new Date());
      setIsWasmReady(true);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Compilation failed");
    } finally {
      if (compileControllerRef.current === controller) {
        compileControllerRef.current = null;
        setIsCompiling(false);
      }
    }
  }, [source, sources]);

  useEffect(() => {
    if (!autoPreview || typeof source.content !== "string" || !source.content.trim()) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void renderPreview(), 1_000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [autoPreview, renderPreview, source]);

  const exportSCAD = useCallback(() => {
    if (typeof source.content !== "string" || !source.content.trim()) {
      setError("Nothing to export.");
      return;
    }

    try {
      const downloadName = fileName.endsWith(".scad") ? fileName : `${fileName}.scad`;
      downloadBlob(new Blob([source.content], { type: "text/plain" }), downloadName);
      toast.success("SCAD file exported successfully", { description: `Saved as ${downloadName}` });
    } catch {
      toast.error("Failed to export SCAD file");
    }
  }, [fileName, source.content]);

  const exportSTLOperation = useMemo<ExportSTLOperation>(
    () => ({
      run: async (onProgress) => {
        if (typeof source.content !== "string" || !source.content.trim()) {
          throw new Error("Enter OpenSCAD code before exporting STL.");
        }

        onProgress({ status: "exporting", progress: 0, statusText: "Rendering STL..." });
        const result = await compileOpenSCADProject({
          files: sources,
          entryPath: source.path,
          format: "stl",
          onProgress: (progress, statusText) =>
            onProgress({ status: "exporting", progress, statusText: `${statusText} (${progress}%)...` }),
        });

        if (result.exitCode !== 0 || !result.geometry) {
          const detail = result.stderr ? `\n\nDetails:\n${result.stderr}` : "";
          throw new Error(`No geometry produced (exit code: ${result.exitCode})${detail}`);
        }

        onProgress({ status: "saving", progress: 100, statusText: "Opening save dialog..." });
        const blob = new Blob([result.geometry.buffer as ArrayBuffer], {
          type: "application/octet-stream",
        });
        await saveSTLBlob(blob, fileName.replace(/\.scad$/i, "") + ".stl");
      },
    }),
    [fileName, sources, source.content, source.path],
  );

  return {
    canRender: Boolean(source.content),
    canExport: typeof source.content === "string" && Boolean(source.content.trim()),
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

function downloadBlob(blob: Blob, downloadName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = downloadName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
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
        types: [{ description: "STL File", accept: { "application/octet-stream": [".stl"] } }],
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
