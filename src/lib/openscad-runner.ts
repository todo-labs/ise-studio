export interface OpenSCADSource {
  path: string;
  content: string;
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

let isRunning = false;
let requestQueue: { invocation: OpenSCADInvocation, resolve: ResolveFn, reject: RejectFn }[] = [];

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
      if (data.stderr) stderrChunks.push(data.stderr);
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

export function runOpenSCAD(invocation: OpenSCADInvocation): Promise<OpenSCADResult> {
  return new Promise<OpenSCADResult>((resolve, reject) => {
    requestQueue.push({ invocation, resolve, reject });
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

export async function compileOpenSCAD(
  code: string,
  options: {
    format?: "stl" | "off";
    preview?: boolean;
    fileName?: string;
  } = {},
): Promise<CompileResult> {
  const format = options.format ?? "stl";
  const fileName = options.fileName ?? "input.scad";
  const outputFile = format === "stl" ? "output.stl" : "output.off";
  const exportFlag = format === "stl" ? "binstl" : "off";

  const args = [
    `--backend=manifold`,
    `--export-format=${exportFlag}`,
    "-o",
    `/${outputFile}`,
    `/${fileName}`,
  ];

  if (options.preview) {
    code = "$preview=true;\n" + code;
  }

  const result = await runOpenSCAD({
    inputs: [{ path: `/${fileName}`, content: code }],
    args,
    outputPaths: [`/${outputFile}`],
  });

  const geometryData = result.outputs.get(`/${outputFile}`) ?? null;

  return {
    geometry: geometryData,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    format,
  };
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

export async function checkSyntax(code: string): Promise<SyntaxCheckResult> {
  const checkFile = "/input.ast";
  const result = await runOpenSCAD({
    inputs: [{ path: "/input.scad", content: `$preview=true;\n${code}` }],
    args: ["-o", checkFile, "/input.scad"],
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
