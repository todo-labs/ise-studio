import { ensureOpenSCADLibraries } from "@/lib/openscad-library-cache";
import { getOpenSCADLibrariesForSource } from "@/lib/openscad-library-manifest";

let instance: any = null;
let loading: Promise<any> | null = null;
const mountedLibraries = new Set<string>();
const libraryMounts = new Map<string, Promise<void>>();

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
        noExitRuntime: true,
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

async function mountLibrariesForInputs(
  fs: any,
  inputs: { path: string; content: string }[],
) {
  const libraries = getOpenSCADLibrariesForSource(inputs.map((input) => input.content).join("\n"));

  for (const library of libraries) {
    if (mountedLibraries.has(library.name)) continue;

    let mount = libraryMounts.get(library.name);
    if (!mount) {
      mount = ensureOpenSCADLibraries(fs, [library])
        .then(() => {
          mountedLibraries.add(library.name);
        })
        .catch((error) => {
          libraryMounts.delete(library.name);
          throw error;
        });
      libraryMounts.set(library.name, mount);
    }

    await mount;
  }
}

async function handleInvocation(invocation: {
  inputs: { path: string; content: string }[];
  args: string[];
  outputPaths: string[];
}): Promise<void> {
  const startTime = performance.now();

  try {
    const scad = await loadOpenSCAD();
    await mountLibrariesForInputs(scad.FS, invocation.inputs);

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
