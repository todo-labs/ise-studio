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
];
