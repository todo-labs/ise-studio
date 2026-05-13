import { runOpenSCAD, type ProgressCallback } from "./worker-client";
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
}): Promise<CompileResult> {
  const { invocation, outputPath, format } = buildCompileInvocation(options);
  const result = await runOpenSCAD(invocation, options.onProgress);
  const geometryData = result.outputs.get(outputPath) ?? null;

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
  });
}
