import { runOpenSCAD, type ProgressCallback } from "./worker-client";

export interface CompileResult {
  geometry: Uint8Array | null;
  stdout: string;
  stderr: string;
  exitCode: number;
  format: "stl" | "off";
}

export interface CompileProjectFile {
  path: string;
  content: string | Uint8Array | ArrayBuffer | Blob;
}

export async function compileOpenSCADProject(options: {
  files: CompileProjectFile[];
  entryPath: string;
  format?: "stl" | "off";
  preview?: boolean;
  onProgress?: ProgressCallback;
}): Promise<CompileResult> {
  const format = options.format ?? "stl";
  const outputFile = format === "stl" ? "output.stl" : "output.off";
  const exportFlag = format === "stl" ? "binstl" : "off";
  const entryPath = normalizeRunnerPath(options.entryPath);

  const inputs = options.files.map((file) => {
    const inputPath = normalizeRunnerPath(file.path);
    const shouldInjectPreview =
      options.preview && inputPath === entryPath && typeof file.content === "string";
    return {
      path: inputPath,
      content: shouldInjectPreview ? `$preview=true;\n${file.content}` : file.content,
    };
  });

  const args = [`--backend=manifold`, `--export-format=${exportFlag}`, "-o", `/${outputFile}`, entryPath];

  const result = await runOpenSCAD(
    {
      inputs,
      args,
      outputPaths: [`/${outputFile}`],
    },
    options.onProgress,
  );

  const geometryData = result.outputs.get(`/${outputFile}`) ?? null;

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
    format?: "stl" | "off";
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

function normalizeRunnerPath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}
