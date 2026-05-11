import { ensureOpenSCADLibraries } from "@/lib/openscad-library-cache";
import { OPENSCAD_LIBRARY_DEFINITIONS } from "@/lib/openscad-library-manifest";

let instance: any = null;
let loading: Promise<any> | null = null;
let librariesMounted: Promise<void> | null = null;

async function loadOpenSCAD(): Promise<any> {
  if (instance) return instance;
  if (loading) return loading;

  const wasmBaseUrl = new URL("/static/wasm/", self.location.origin).href;

  loading = (async () => {
    try {
      const jsUrl = new URL("openscad.js", wasmBaseUrl).href;

      const module = await import(/* @vite-ignore */ jsUrl);
      const OpenSCADFactory = module.default || module;

      instance = await OpenSCADFactory({
        noInitialRun: true,
        print: (text: string) => {
          if (text) postMessage({ type: "stream", stdout: text });
        },
        printErr: (text: string) => {
          if (text) postMessage({ type: "stream", stderr: text });
        },
        locateFile: (file: string) => {
          return new URL(file, wasmBaseUrl).href;
        },
      });

      await mountLibraries(instance.FS);

      return instance;
    } catch (err) {
      loading = null;
      throw new Error(
        `Failed to load OpenSCAD WASM: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  })();

  return loading;
}

async function mountLibraries(fs: any) {
  if (!librariesMounted) {
    librariesMounted = (async () => {
      await ensureOpenSCADLibraries(fs, OPENSCAD_LIBRARY_DEFINITIONS);
    })().catch((error) => {
      librariesMounted = null;
      throw error;
    });
  }

  await librariesMounted;
}

async function handleInvocation(invocation: {
  inputs: { path: string; content: string }[];
  args: string[];
  outputPaths: string[];
}): Promise<void> {
  const startTime = performance.now();

  try {
    const scad = await loadOpenSCAD();

    for (const input of invocation.inputs) {
      const dir = input.path.substring(0, input.path.lastIndexOf("/"));
      if (dir) {
        try {
          scad.FS.mkdirTree(dir);
        } catch {}
      }
      scad.FS.writeFile(input.path, new TextEncoder().encode(input.content));
    }

    scad.FS.chdir("/");

    let exitCode = 0;
    try {
      scad.callMain(invocation.args);
    } catch (e: any) {
      exitCode = typeof e?.status === "number" ? e.status : 1;
    }

    const outputs: [string, Uint8Array][] = [];
    for (const path of invocation.outputPaths) {
      try {
        const data = scad.FS.readFile(path);
        outputs.push([path, new Uint8Array(data)]);
      } catch {}
      try {
        scad.FS.unlink(path);
      } catch {}
    }

    for (const input of invocation.inputs) {
      try {
        scad.FS.unlink(input.path);
      } catch {}
    }

    const elapsedMs = performance.now() - startTime;

    postMessage({
      type: "result",
      result: {
        exitCode,
        outputs,
        elapsedMs,
      },
    });
  } catch (err) {
    postMessage({
      type: "error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

self.onmessage = (e: MessageEvent) => {
  handleInvocation(e.data);
};
