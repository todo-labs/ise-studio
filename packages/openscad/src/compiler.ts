import { runOpenSCAD, type OpenSCADRunOptions, type ProgressCallback } from "./worker-client";
import { getCompileCacheKey, readCachedGeometry, writeCachedGeometry } from "./compile-cache";
import {
  buildCompileInvocation,
  type OpenSCADExportFormat,
  type OpenSCADProjectFile,
} from "./invocation";

export interface CompileResult {
  geometry: Uint8Array | null;
  stdout: string;
  stderr: string;
  exitCode: number;
  format: OpenSCADExportFormat;
}

export type CompileProjectFile = OpenSCADProjectFile;

export async function compileOpenSCADProject(options: {
  files: CompileProjectFile[];
  entryPath: string;
  format?: OpenSCADExportFormat;
  preview?: boolean;
  onProgress?: ProgressCallback;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<CompileResult> {
  const { invocation, outputPath, format } = buildCompileInvocation(options);
  const cacheKey = await getCompileCacheKey({
    files: options.files,
    entryPath: options.entryPath,
    format,
    preview: Boolean(options.preview),
  });
  const cachedGeometry = await readCachedGeometry(cacheKey);
  if (cachedGeometry) {
    return {
      geometry: cachedGeometry,
      stdout: "",
      stderr: "",
      exitCode: 0,
      format,
    };
  }

  const runOptions: OpenSCADRunOptions = {
    signal: options.signal,
    timeoutMs: options.timeoutMs,
  };
  const result = await runOpenSCAD(invocation, options.onProgress, runOptions);
  const geometryData = result.outputs.get(outputPath) ?? null;
  if (result.exitCode === 0 && geometryData) {
    await writeCachedGeometry(cacheKey, geometryData, format);
  }

  return {
    geometry: geometryData,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    format,
  };
}

export async function compileOpenSCAD(
  code: string,
  options: {
    format?: OpenSCADExportFormat;
    preview?: boolean;
    fileName?: string;
    onProgress?: ProgressCallback;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<CompileResult> {
  const format = options.format ?? "stl";
  const fileName = options.fileName ?? "input.scad";

  return compileOpenSCADProject({
    files: [{ path: fileName, content: code }],
    entryPath: fileName,
    format,
    preview: options.preview,
    onProgress: options.onProgress,
    signal: options.signal,
    timeoutMs: options.timeoutMs,
  });
}
