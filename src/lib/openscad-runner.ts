export interface OpenSCADSource {
  path: string;
  content: string | Uint8Array | ArrayBuffer | Blob;
}

export interface ProcessStreams {
  stdout?: string;
  stderr?: string;
}

export interface OpenSCADResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  outputs: Map<string, Uint8Array>;
  elapsedMs: number;
}

export interface OpenSCADInvocation {
  inputs: OpenSCADSource[];
  args: string[];
  outputPaths: string[];
}

type ResolveFn = (result: OpenSCADResult) => void;
type RejectFn = (error: Error) => void;
export type ProgressCallback = (progress: number, status: string) => void;

let isRunning = false;
let requestQueue: { invocation: OpenSCADInvocation, resolve: ResolveFn, reject: RejectFn, onProgress?: ProgressCallback }[] = [];

let activeWorker: Worker | null = null;

function processQueue() {
  if (isRunning || requestQueue.length === 0) return;
  isRunning = true;
  
  const req = requestQueue.shift()!;
  
  activeWorker = new Worker(new URL("../workers/openscad-worker.ts", import.meta.url), {
    type: "module",
  });
  
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  
  const cleanup = () => {
    if (activeWorker) {
      activeWorker.terminate();
      activeWorker = null;
    }
    isRunning = false;
    processQueue();
  };
  
  activeWorker.onmessage = (e: MessageEvent) => {
    const data = e.data;
    if (data.type === "stream") {
      if (data.stdout) stdoutChunks.push(data.stdout);
      if (data.stderr) {
        stderrChunks.push(data.stderr);
        // Try to parse progress from stderr
        // Format: "Rendering (20%)..." or "Compiling design (50%)..." or "Parsing design (100%)..."
        const progressMatch = data.stderr.match(/(Rendering|Compiling design|Parsing design)\s+\((\d+)%\)\.\.\./);
        if (progressMatch && req.onProgress) {
          const status = progressMatch[1];
          const percent = parseInt(progressMatch[2], 10);
          req.onProgress(percent, status);
        }
      }
    } else if (data.type === "result") {
      const result = data.result as Omit<OpenSCADResult, "outputs"> & { outputs: [string, Uint8Array][] };
      req.resolve({
        ...result,
        outputs: new Map(result.outputs ?? []),
        stdout: stdoutChunks.join("\n"),
        stderr: stderrChunks.join("\n"),
      });
      cleanup();
    } else if (data.type === "error") {
      req.reject(new Error(data.error));
      cleanup();
    }
  };
  
  activeWorker.onerror = (e: ErrorEvent) => {
    req.reject(new Error(e.message || "Worker error"));
    cleanup();
  };
  
  activeWorker.postMessage(req.invocation);
}

export function runOpenSCAD(
  invocation: OpenSCADInvocation,
  onProgress?: ProgressCallback,
): Promise<OpenSCADResult> {
  return new Promise<OpenSCADResult>((resolve, reject) => {
    requestQueue.push({
      invocation,
      resolve,
      reject,
      onProgress,
    });
    processQueue();
  });
}

export function terminateOpenSCAD(): void {
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }
  isRunning = false;
  for (const req of requestQueue) {
    req.reject(new Error("Worker terminated"));
  }
  requestQueue = [];
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    terminateOpenSCAD();
  });
}

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

  const args = [
    `--backend=manifold`,
    `--export-format=${exportFlag}`,
    "-o",
    `/${outputFile}`,
    entryPath,
  ];

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

export interface SyntaxCheckResult {
  valid: boolean;
  errors: SyntaxError[];
  stdout: string;
  stderr: string;
}

export interface SyntaxError {
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning";
}

export async function checkSyntax(
  code: string,
  options: { files?: CompileProjectFile[]; entryPath?: string } = {},
): Promise<SyntaxCheckResult> {
  const checkFile = "/input.ast";
  const entryPath = normalizeRunnerPath(options.entryPath ?? "input.scad");
  const files = options.files?.length
    ? options.files.map((file) => ({
        path: normalizeRunnerPath(file.path),
        content:
          normalizeRunnerPath(file.path) === entryPath && typeof file.content === "string"
            ? `$preview=true;\n${file.content}`
            : file.content,
      }))
    : [{ path: "/input.scad", content: `$preview=true;\n${code}` }];

  const result = await runOpenSCAD({
    inputs: files,
    args: ["-o", checkFile, entryPath],
    outputPaths: [checkFile],
  });

  const errors: SyntaxError[] = [];
  const errorRegex = /"?(\/input\.scad)?:?(\d+)?"?(?::?\s*(warning|ERROR):\s*)?(.+)/g;
  for (const line of result.stderr.split("\n")) {
    const match = errorRegex.exec(line);
    if (match) {
      const lineNum = match[2] ? parseInt(match[2], 10) - 1 : 0;
      const severity = match[3]?.toLowerCase() === "warning" ? "warning" : "error";
      errors.push({
        line: Math.max(0, lineNum),
        column: 0,
        message: match[4] || line,
        severity: severity as "error" | "warning",
      });
    }
    errorRegex.lastIndex = 0;
  }

  return {
    valid: errors.filter((e) => e.severity === "error").length === 0 && result.exitCode === 0,
    errors,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function normalizeRunnerPath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}
