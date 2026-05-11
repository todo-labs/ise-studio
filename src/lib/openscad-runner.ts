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

let worker: Worker | null = null;
let pendingResolve: ResolveFn | null = null;
let pendingReject: RejectFn | null = null;
let stdoutChunks: string[] = [];
let stderrChunks: string[] = [];

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("../workers/openscad-worker.ts", import.meta.url), {
    type: "module",
  });
  worker.onmessage = (e: MessageEvent) => {
    const data = e.data;
    if (data.type === "stream") {
      if (data.stdout) stdoutChunks.push(data.stdout);
      if (data.stderr) stderrChunks.push(data.stderr);
    } else if (data.type === "result") {
      const resolve = pendingResolve;
      pendingResolve = null;
      pendingReject = null;
      const result = data.result as Omit<OpenSCADResult, "outputs"> & { outputs: [string, Uint8Array][] };
      resolve?.({
        ...result,
        outputs: new Map(result.outputs ?? []),
        stdout: stdoutChunks.join("\n"),
        stderr: stderrChunks.join("\n"),
      });
    } else if (data.type === "error") {
      const reject = pendingReject;
      pendingResolve = null;
      pendingReject = null;
      reject?.(new Error(data.error));
    }
  };
  worker.onerror = (e: ErrorEvent) => {
    const reject = pendingReject;
    pendingResolve = null;
    pendingReject = null;
    reject?.(new Error(e.message || "Worker error"));
  };
  return worker;
}

export function runOpenSCAD(invocation: OpenSCADInvocation): Promise<OpenSCADResult> {
  const w = getWorker();
  stdoutChunks = [];
  stderrChunks = [];

  return new Promise<OpenSCADResult>((resolve, reject) => {
    pendingResolve = resolve;
    pendingReject = reject;
    w.postMessage(invocation);
  });
}

export function terminateOpenSCAD(): void {
  if (worker) {
    worker.terminate();
    worker = null;
    pendingResolve = null;
    pendingReject = null;
  }
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
