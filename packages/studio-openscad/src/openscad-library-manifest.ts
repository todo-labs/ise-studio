export interface OpenSCADLibraryDefinition {
  name: string;
  archiveUrl: string;
  rootPrefix: string;
  includeExtensions: string[];
  includePaths?: string[];
  symlinks?: Record<string, string>;
}

export const OPENSCAD_LIBRARY_DEFINITIONS: OpenSCADLibraryDefinition[] = [
  {
    name: "openscad",
    archiveUrl: "/static/openscad-libs/openscad-master.zip",
    rootPrefix: "openscad-master",
    includeExtensions: [".scad", ".txt", ".md"],
    includePaths: ["examples/"],
    symlinks: {
      openscad: ".",
    },
  },
  {
    name: "MCAD",
    archiveUrl: "/static/openscad-libs/MCAD-master.zip",
    rootPrefix: "MCAD-master",
    includeExtensions: [".scad", ".txt", ".md"],
    symlinks: {
      MCAD: ".",
    },
  },
  {
    name: "BOSL2",
    archiveUrl: "/static/openscad-libs/BOSL2-master.zip",
    rootPrefix: "BOSL2-master",
    includeExtensions: [".scad", ".txt", ".md"],
    symlinks: {
      BOSL2: ".",
    },
  },
  {
    name: "BOSL",
    archiveUrl: "/static/openscad-libs/BOSL-master.zip",
    rootPrefix: "BOSL-master",
    includeExtensions: [".scad", ".txt", ".md"],
    symlinks: {
      BOSL: ".",
    },
  },
  {
    name: "NopSCADlib",
    archiveUrl: "/static/openscad-libs/NopSCADlib-master.zip",
    rootPrefix: "NopSCADlib-master",
    includeExtensions: [".scad", ".txt", ".md"],
    symlinks: {
      NopSCADlib: ".",
    },
  },
  {
    name: "funcutils",
    archiveUrl: "/static/openscad-libs/funcutils-master.zip",
    rootPrefix: "funcutils-master",
    includeExtensions: [".scad", ".txt", ".md"],
    symlinks: {
      funcutils: ".",
    },
  },
  {
    name: "FunctionalOpenSCAD",
    archiveUrl: "/static/openscad-libs/FunctionalOpenSCAD-master.zip",
    rootPrefix: "FunctionalOpenSCAD-master",
    includeExtensions: [".scad", ".txt", ".md"],
    symlinks: {
      FunctionalOpenSCAD: ".",
    },
  },
  {
    name: "YAPP_Box",
    archiveUrl: "/static/openscad-libs/YAPP_Box-main.zip",
    rootPrefix: "YAPP_Box-main",
    includeExtensions: [".scad", ".txt", ".md"],
    symlinks: {
      YAPP_Box: ".",
    },
  },
  {
    name: "boltsparts",
    archiveUrl: "/static/openscad-libs/boltsparts-main.zip",
    rootPrefix: "boltsparts-main/backends/openscad",
    includeExtensions: [".scad", ".txt", ".md"],
    symlinks: {
      boltsparts: ".",
    },
  },
  {
    name: "OpenSCAD-Snippet",
    archiveUrl: "/static/openscad-libs/OpenSCAD-Snippet-main.zip",
    rootPrefix: "OpenSCAD-Snippet-main",
    includeExtensions: [".scad", ".txt", ".md"],
    symlinks: {
      "OpenSCAD-Snippet": ".",
    },
  },
  {
    name: "Stemfie_OpenSCAD",
    archiveUrl: "/static/openscad-libs/Stemfie_OpenSCAD-main.zip",
    rootPrefix: "Stemfie_OpenSCAD-main",
    includeExtensions: [".scad", ".txt", ".md"],
    symlinks: {
      Stemfie_OpenSCAD: ".",
    },
  },
  {
    name: "pathbuilder",
    archiveUrl: "/static/openscad-libs/pathbuilder-main.zip",
    rootPrefix: "pathbuilder-main",
    includeExtensions: [".scad", ".txt", ".md"],
    symlinks: {
      pathbuilder: ".",
    },
  },
  {
    name: "openscad_attachable_text3d",
    archiveUrl: "/static/openscad-libs/openscad_attachable_text3d-main.zip",
    rootPrefix: "openscad_attachable_text3d-main",
    includeExtensions: [".scad", ".txt", ".md"],
    symlinks: {
      openscad_attachable_text3d: ".",
    },
  },
  {
    name: "brailleSCAD",
    archiveUrl: "/static/openscad-libs/brailleSCAD-main.zip",
    rootPrefix: "brailleSCAD-main",
    includeExtensions: [".scad", ".txt", ".md"],
    symlinks: {
      brailleSCAD: ".",
    },
  },
  {
    name: "smooth-prim",
    archiveUrl: "/static/openscad-libs/smooth-prim-master.zip",
    rootPrefix: "smooth-prim-master",
    includeExtensions: [".scad", ".txt", ".md"],
    symlinks: {
      "smooth-prim": ".",
    },
  },
  {
    name: "plot-function",
    archiveUrl: "/static/openscad-libs/plot-function-master.zip",
    rootPrefix: "plot-function-master",
    includeExtensions: [".scad", ".txt", ".md"],
    symlinks: {
      "plot-function": ".",
    },
  },
  {
    name: "closepoints",
    archiveUrl: "/static/openscad-libs/closepoints-master.zip",
    rootPrefix: "closepoints-master",
    includeExtensions: [".scad", ".txt", ".md"],
    symlinks: {
      closepoints: ".",
    },
  },
  {
    name: "UB.scad",
    archiveUrl: "/static/openscad-libs/UB.scad-main.zip",
    rootPrefix: "UB.scad-main",
    includeExtensions: [".scad", ".txt", ".md"],
    includePaths: ["libraries/", "examples/UBexamples/"],
    symlinks: {
      "UB.scad": "libraries",
    },
  },
  {
    name: "openscad-tray",
    archiveUrl: "/static/openscad-libs/openscad-tray-main.zip",
    rootPrefix: "openscad-tray-main",
    includeExtensions: [".scad", ".txt", ".md"],
    symlinks: {
      "openscad-tray": ".",
    },
  },
  {
    name: "lasercut",
    archiveUrl: "/static/openscad-libs/lasercut-master.zip",
    rootPrefix: "lasercut-master",
    includeExtensions: [".scad", ".txt", ".md"],
    symlinks: {
      lasercut: ".",
    },
  },
];

export function getOpenSCADLibraryAliases() {
  return OPENSCAD_LIBRARY_DEFINITIONS.flatMap((library) =>
    Object.keys(library.symlinks ?? { [library.name]: "." }).map((alias) => ({
      alias,
      name: library.name,
    })),
  );
}

export function getOpenSCADLibrariesForSource(source: string) {
  const referencedAliases = new Set<string>();
  const includeRegex = /\b(?:include|use)\s*<([^>]+)>/g;

  for (const match of source.matchAll(includeRegex)) {
    const includePath = match[1]?.trim();
    if (!includePath) continue;

    const alias = includePath.split("/")[0];
    if (alias) {
      referencedAliases.add(alias);
    }
  }

  return OPENSCAD_LIBRARY_DEFINITIONS.filter((library) => {
    const libraryAliases = Object.keys(library.symlinks ?? { [library.name]: "." });
    return libraryAliases.some((alias) => referencedAliases.has(alias));
  });
}

export function getOpenSCADLibraryContext() {
  const aliases = getOpenSCADLibraryAliases();
  const aliasList = aliases.map(({ alias, name }) => `${alias} (${name})`).join(", ");
  const examples = [
    "include <BOSL2/std.scad>",
    "include <MCAD/boxes.scad>",
    "include <NopSCADlib/core.scad>",
    "include <BOSL/constants.scad>",
    "include <funcutils/funcutils.scad>",
  ];

  return [
    "Bundled OpenSCAD libraries are mounted on demand in the browser worker before validation and rendering code that includes them.",
    `Available include/use aliases: ${aliasList}.`,
    `Common include examples: ${examples.join("; ")}.`,
    "Prefer these bundled libraries when they help, and validate library-based examples with validate_dsl or inspect_scene.",
  ].join("\n");
}
