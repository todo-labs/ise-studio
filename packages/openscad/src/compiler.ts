import { runOpenSCAD, type OpenSCADRunOptions, type ProgressCallback } from "./worker-client";
import { getCompileCacheKey, readCachedGeometry, writeCachedGeometry } from "./compile-cache";
import {
  buildCompileInvocation,
  type OpenSCADExportFormat,
} from "./invocation";

export interface CompileResult {
  geometry: Uint8Array | null;
  stdout: string;
  stderr: string;
  exitCode: number;
  format: OpenSCADExportFormat;
}

export async function compileOpenSCAD(code: string, options: {
  fileName?: string;
  format?: OpenSCADExportFormat;
  preview?: boolean;
  onProgress?: ProgressCallback;
  signal?: AbortSignal;
  timeoutMs?: number;
} = {}): Promise<CompileResult> {
  const fileName = options.fileName ?? "input.scad";
  const format = options.format ?? "stl";
  const { invocation, outputPath } = buildCompileInvocation({
    code,
    fileName,
    format,
    preview: options.preview,
  });
  const cacheKey = await getCompileCacheKey({
    code,
    fileName,
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
