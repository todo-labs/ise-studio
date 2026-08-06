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

interface QueuedRequest {
  invocation: OpenSCADInvocation;
  resolve: ResolveFn;
  reject: RejectFn;
  onProgress?: ProgressCallback;
  signal?: AbortSignal;
  timeoutMs: number;
  settled: boolean;
  removeAbortListener?: () => void;
}

export interface OpenSCADRunOptions {
  /** Abort queued or active work. */
  signal?: AbortSignal;
  /** Maximum active-worker runtime. Defaults to thirty seconds. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

let isRunning = false;
let requestQueue: QueuedRequest[] = [];

let activeWorker: Worker | null = null;
let activeRequest: (typeof requestQueue)[number] | null = null;

function processQueue() {
  if (isRunning || requestQueue.length === 0) return;
  isRunning = true;

  const req = requestQueue.shift()!;
  req.removeAbortListener?.();
  req.removeAbortListener = undefined;
  activeRequest = req;

  if (req.signal?.aborted) {
    req.settled = true;
    req.reject(createAbortError());
    activeRequest = null;
    isRunning = false;
    processQueue();
    return;
  }

  activeWorker = new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
  });

  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  let timeout: ReturnType<typeof setTimeout> | null = setTimeout(() => {
    if (req.settled) return;
    req.settled = true;
    req.removeAbortListener?.();
    req.reject(new Error(`OpenSCAD compilation timed out after ${req.timeoutMs} ms.`));
    cleanup();
  }, req.timeoutMs);

  const cleanup = () => {
    if (timeout) clearTimeout(timeout);
    timeout = null;
    req.removeAbortListener?.();
    if (activeWorker) {
      activeWorker.terminate();
      activeWorker = null;
    }
    activeRequest = null;
    isRunning = false;
    processQueue();
  };

  activeWorker.onmessage = (e: MessageEvent) => {
    if (req.settled) return;
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
      req.settled = true;
      const result = data.result as Omit<OpenSCADResult, "outputs"> & { outputs: [string, Uint8Array][] };
      req.resolve({
        ...result,
        outputs: new Map(result.outputs ?? []),
        stdout: stdoutChunks.join("\n"),
        stderr: stderrChunks.join("\n"),
      });
      cleanup();
    } else if (data.type === "error") {
      req.settled = true;
      req.reject(new Error(data.error));
      cleanup();
    }
  };

  activeWorker.onerror = (e: ErrorEvent) => {
    if (req.settled) return;
    req.settled = true;
    req.reject(new Error(e.message || "Worker error"));
    cleanup();
  };

  if (req.signal) {
    const abort = () => {
      if (req.settled) return;
      req.settled = true;
      req.reject(createAbortError());
      cleanup();
    };
    req.signal.addEventListener("abort", abort, { once: true });
    req.removeAbortListener = () => req.signal?.removeEventListener("abort", abort);
  }

  activeWorker.postMessage(req.invocation);
}

export function runOpenSCAD(
  invocation: OpenSCADInvocation,
  onProgress?: ProgressCallback,
  options: OpenSCADRunOptions = {},
): Promise<OpenSCADResult> {
  return new Promise<OpenSCADResult>((resolve, reject) => {
    const request: QueuedRequest = {
      invocation,
      resolve,
      reject,
      onProgress,
      signal: options.signal,
      timeoutMs: Math.max(1, options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      settled: false,
    };

    if (options.signal?.aborted) {
      request.settled = true;
      reject(createAbortError());
      return;
    }

    if (options.signal) {
      const abortQueued = () => {
        if (request.settled) return;
        const index = requestQueue.indexOf(request);
        if (index !== -1) requestQueue.splice(index, 1);
        request.settled = true;
        reject(createAbortError());
      };
      options.signal.addEventListener("abort", abortQueued, { once: true });
      request.removeAbortListener = () => options.signal?.removeEventListener("abort", abortQueued);
    }

    requestQueue.push(request);
    processQueue();
  });
}

export function terminateOpenSCAD(): void {
  if (activeRequest && !activeRequest.settled) {
    activeRequest.settled = true;
    activeRequest.removeAbortListener?.();
    activeRequest.reject(new Error("Worker terminated"));
  }
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }
  activeRequest = null;
  isRunning = false;
  for (const req of requestQueue) {
    req.settled = true;
    req.removeAbortListener?.();
    req.reject(new Error("Worker terminated"));
  }
  requestQueue = [];
}

function createAbortError() {
  return new Error("OpenSCAD compilation cancelled.");
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    terminateOpenSCAD();
  });
}
