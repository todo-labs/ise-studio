import type { OpenSCADInvocation, OpenSCADSource } from "./worker-client";

export type OpenSCADExportFormat = "stl" | "off";

export interface OpenSCADInvocationOptions {
  code: string;
  fileName: string;
  preview?: boolean;
}

export interface CompileInvocationOptions extends OpenSCADInvocationOptions {
  format?: OpenSCADExportFormat;
}

export interface SyntaxInvocationOptions extends OpenSCADInvocationOptions {
  astPath?: string;
}

export interface BuiltCompileInvocation {
  invocation: OpenSCADInvocation;
  format: OpenSCADExportFormat;
  outputPath: string;
}

export interface BuiltSyntaxInvocation {
  invocation: OpenSCADInvocation;
  entryPath: string;
  astPath: string;
}

export function buildCompileInvocation(options: CompileInvocationOptions): BuiltCompileInvocation {
  const format = options.format ?? "stl";
  const outputPath = format === "stl" ? "/output.stl" : "/output.off";
  const exportFlag = format === "stl" ? "binstl" : "off";
  const entryPath = normalizeRunnerPath(options.fileName);

  return {
    format,
    outputPath,
    invocation: {
      inputs: [mountSource(options.code, entryPath, Boolean(options.preview))],
      args: [`--backend=manifold`, `--export-format=${exportFlag}`, "-o", outputPath, entryPath],
      outputPaths: [outputPath],
    },
  };
}

export function buildSyntaxInvocation(options: SyntaxInvocationOptions): BuiltSyntaxInvocation {
  const entryPath = normalizeRunnerPath(options.fileName);
  const astPath = normalizeRunnerPath(options.astPath ?? "input.ast");

  return {
    entryPath,
    astPath,
    invocation: {
      inputs: [mountSource(options.code, entryPath, Boolean(options.preview))],
      args: ["-o", astPath, entryPath],
      outputPaths: [astPath],
    },
  };
}

function mountSource(code: string, path: string, preview: boolean): OpenSCADSource {
  return { path, content: preview ? `$preview=true;\n${code}` : code };
}

export function normalizeRunnerPath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}
