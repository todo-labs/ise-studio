import type { OpenSCADInvocation, OpenSCADSource } from "./worker-client";

export type OpenSCADExportFormat = "stl" | "off";

export interface OpenSCADProjectFile {
  path: string;
  content: string | Uint8Array | ArrayBuffer | Blob;
}

export interface OpenSCADInvocationOptions {
  files: OpenSCADProjectFile[];
  entryPath: string;
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
  const entryPath = normalizeRunnerPath(options.entryPath);

  return {
    format,
    outputPath,
    invocation: {
      inputs: mountProjectSources(options.files, entryPath, Boolean(options.preview)),
      args: [`--backend=manifold`, `--export-format=${exportFlag}`, "-o", outputPath, entryPath],
      outputPaths: [outputPath],
    },
  };
}

export function buildSyntaxInvocation(options: SyntaxInvocationOptions): BuiltSyntaxInvocation {
  const entryPath = normalizeRunnerPath(options.entryPath);
  const astPath = normalizeRunnerPath(options.astPath ?? "input.ast");

  return {
    entryPath,
    astPath,
    invocation: {
      inputs: mountProjectSources(options.files, entryPath, Boolean(options.preview)),
      args: ["-o", astPath, entryPath],
      outputPaths: [astPath],
    },
  };
}

export function mountProjectSources(
  files: readonly OpenSCADProjectFile[],
  entryPath: string,
  preview: boolean,
): OpenSCADSource[] {
  const normalizedEntryPath = normalizeRunnerPath(entryPath);

  return files.map((file) => {
    const path = normalizeRunnerPath(file.path);
    const shouldInjectPreview = preview && path === normalizedEntryPath && typeof file.content === "string";
    return {
      path,
      content: shouldInjectPreview ? `$preview=true;\n${file.content}` : file.content,
    };
  });
}

export function normalizeRunnerPath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}
