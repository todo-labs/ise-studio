export interface OpenSCADDocEntry {
  id: string;
  title: string;
  summary: string;
  keywords: string[];
  example: string;
  url: string;
}

export interface OpenSCADDocSearchResult extends OpenSCADDocEntry {
  score: number;
}

const DB_NAME = "ise-studio-openscad-docs";
const DB_VERSION = 1;
const STORE_NAME = "docs";
const CACHE_VERSION_KEY = "ise-studio-openscad-docs-version";
const CACHE_VERSION = "2026-05-11";

const OPENSCAD_DOCS: OpenSCADDocEntry[] = [
  {
    id: "language-overview",
    title: "The OpenSCAD Language",
    summary:
      "Overview of the language, compile-time evaluation, scope, and how OpenSCAD differs from imperative modelers.",
    keywords: ["language", "overview", "scope", "compile-time"],
    example: "OpenSCAD evaluates geometry from declarations rather than step-by-step drawing.",
    url: "https://openscad.org/documentation.html",
  },
  {
    id: "primitives-3d",
    title: "3D Primitives",
    summary: "The cube, sphere, and cylinder primitives used to start most models.",
    keywords: ["cube", "sphere", "cylinder", "primitive"],
    example: "cube([20, 12, 8], center=true);",
    url: "https://files.openscad.org/documentation/manual/The_OpenSCAD_Language.html",
  },
  {
    id: "primitives-2d",
    title: "2D Primitives",
    summary: "The square, circle, polygon, and text primitives for flat geometry.",
    keywords: ["square", "circle", "polygon", "text", "2d"],
    example: "circle(r=10);",
    url: "https://files.openscad.org/documentation/manual/The_OpenSCAD_Language.html",
  },
  {
    id: "transformations",
    title: "Transformations",
    summary: "Translate, rotate, scale, mirror, and resize geometry.",
    keywords: ["translate", "rotate", "scale", "mirror", "resize"],
    example: "translate([0, 0, 4]) cube(8);",
    url: "https://files.openscad.org/documentation/manual/Transformations.html",
  },
  {
    id: "booleans",
    title: "Boolean Operations",
    summary: "Union, difference, and intersection for constructive solid geometry.",
    keywords: ["union", "difference", "intersection", "csg"],
    example: "difference() { cube(20, center=true); sphere(r=10); }",
    url: "https://files.openscad.org/documentation/manual/Boolean_Operations.html",
  },
  {
    id: "extrusion",
    title: "Extrusion to 3D",
    summary: "linear_extrude and rotate_extrude turn 2D shapes into 3D objects.",
    keywords: ["extrude", "linear_extrude", "rotate_extrude"],
    example: "linear_extrude(height=10) circle(r=5);",
    url: "https://files.openscad.org/documentation/manual/2D_to_3D_Extrusion.html",
  },
  {
    id: "text",
    title: "Text",
    summary: "Create 2D text with fonts, alignment, spacing, and language settings.",
    keywords: ["text", "font", "alignment", "2d"],
    example: "text(\"ISE Studio\", size=12, halign=\"center\");",
    url: "https://files.openscad.org/documentation/manual/Text.html",
  },
  {
    id: "modules-functions",
    title: "Functions and Modules",
    summary: "User-defined functions and modules for reusable parametric geometry.",
    keywords: ["module", "function", "reusable", "scope"],
    example: "module wheel(r=10) { cylinder(h=5, r=r, center=true); }",
    url: "https://files.openscad.org/documentation/manual/User-Defined_Functions_and_Modules.html",
  },
  {
    id: "control-flow",
    title: "Control Flow",
    summary: "Conditionals and iterator expressions used to branch and repeat geometry.",
    keywords: ["if", "for", "loop", "iterator", "conditional"],
    example: "for (i = [0:5]) translate([i*12, 0, 0]) sphere(r=3);",
    url: "https://files.openscad.org/documentation/manual/Control_Flow.html",
  },
  {
    id: "math",
    title: "Mathematical Operators and Functions",
    summary: "Numeric helpers used for dimensions, offsets, and computed parameters.",
    keywords: ["math", "functions", "operators", "numbers"],
    example: "r = sin($t * 360) * 10;",
    url: "https://files.openscad.org/documentation/manual/Mathematical_Operators_and_Functions.html",
  },
  {
    id: "special-vars",
    title: "Special Variables",
    summary: "Resolution controls like $fn, $fa, and $fs.",
    keywords: ["$fn", "$fa", "$fs", "resolution"],
    example: "$fn = 64; sphere(r=10);",
    url: "https://files.openscad.org/documentation/manual/Special_Variables.html",
  },
  {
    id: "debugging",
    title: "Debugging Aids",
    summary: "Echo, assert, and modifier characters for inspecting problems.",
    keywords: ["echo", "assert", "debug", "modifier"],
    example: 'echo("bounds", [10, 20, 30]);',
    url: "https://files.openscad.org/documentation/manual/Debugging_Aids.html",
  },
  {
    id: "import-export",
    title: "Importing and Exporting Geometry",
    summary: "Import DXF/SVG/STL/OFF and export common model formats.",
    keywords: ["import", "export", "stl", "off", "svg", "dxf"],
    example: 'import("part.stl");',
    url: "https://files.openscad.org/documentation/manual/Importing-and-Exporting-Geometry.html",
  },
  {
    id: "cheatsheet",
    title: "Code Cheat Sheet",
    summary: "Condensed reference for common syntax and modeling patterns.",
    keywords: ["cheat sheet", "reference", "syntax"],
    example: "union() { cube(10); sphere(5); }",
    url: "https://openscad.org/documentation.html",
  },
];

export async function searchOpenSCADDocs(query: string, limit = 5): Promise<OpenSCADDocSearchResult[]> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const docs = await loadOpenSCADDocs();
  const queryVector = buildVector(tokenize(normalizedQuery));

  return docs
    .map((entry) => {
      const haystack = buildVector(
        tokenize([entry.title, entry.summary, entry.example, ...entry.keywords].join(" ")),
      );
      const score = cosineSimilarity(queryVector, haystack);
      return { ...entry, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function loadOpenSCADDocs(): Promise<OpenSCADDocEntry[]> {
  if (typeof window === "undefined") return OPENSCAD_DOCS;

  const cachedVersion = window.localStorage.getItem(CACHE_VERSION_KEY);
  if (cachedVersion !== CACHE_VERSION) {
    await seedOpenSCADDocs();
    window.localStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION);
  }

  try {
    const db = await openDatabase();
    return await readDocs(db);
  } catch {
    return OPENSCAD_DOCS;
  }
}

async function seedOpenSCADDocs() {
  const db = await openDatabase();
  const docs = await readDocs(db);
  if (docs.length > 0) return;

  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  for (const doc of OPENSCAD_DOCS) {
    store.put(doc);
  }
  await txComplete(tx);
}

async function openDatabase(): Promise<IDBDatabase> {
  return await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open docs index"));
  });
}

async function readDocs(db: IDBDatabase): Promise<OpenSCADDocEntry[]> {
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result as OpenSCADDocEntry[]).slice());
    request.onerror = () => reject(request.error ?? new Error("Failed to read docs index"));
  });
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9$]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function buildVector(tokens: string[]) {
  const vector = new Map<string, number>();
  for (const token of tokens) {
    vector.set(token, (vector.get(token) ?? 0) + 1);
  }
  return vector;
}

function cosineSimilarity(left: Map<string, number>, right: Map<string, number>) {
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (const value of left.values()) {
    leftMagnitude += value * value;
  }
  for (const value of right.values()) {
    rightMagnitude += value * value;
  }
  for (const [token, leftValue] of left.entries()) {
    const rightValue = right.get(token) ?? 0;
    dot += leftValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

async function txComplete(tx: IDBTransaction) {
  return await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}
