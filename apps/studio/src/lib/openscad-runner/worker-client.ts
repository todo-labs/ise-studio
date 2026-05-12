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
let requestQueue: { invocation: OpenSCADInvocation; resolve: ResolveFn; reject: RejectFn; onProgress?: ProgressCallback }[] = [];

let activeWorker: Worker | null = null;

function processQueue() {
  if (isRunning || requestQueue.length === 0) return;
  isRunning = true;

  const req = requestQueue.shift()!;

  activeWorker = new Worker(new URL("../../workers/openscad-worker.ts", import.meta.url), {
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
        const progressMatch = data.stderr.match(/(Rendering|Compiling design|Parsing design)\s+\((\d+)%\)\.\.\./);
        if (progressMatch && req.onProgress) {
          const status = progressMatch[1];
          const percent = Number.parseInt(progressMatch[2], 10);
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

export function runOpenSCAD(invocation: OpenSCADInvocation, onProgress?: ProgressCallback): Promise<OpenSCADResult> {
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
