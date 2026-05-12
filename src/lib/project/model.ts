export type ProjectFileKind = "scad" | "asset";

export interface ProjectTextFile {
  path: string;
  kind: "scad";
  content: string;
}

export interface ProjectAssetFile {
  path: string;
  kind: "asset";
  content: Blob;
}

export type ProjectFile = ProjectTextFile | ProjectAssetFile;

export interface BrowserProject {
  id: string;
  name: string;
  activeFilePath: string;
  files: ProjectFile[];
  createdAt: number;
  updatedAt: number;
}

export const SCAD_EXTENSIONS = [".scad"] as const;
export const ASSET_EXTENSIONS = [".stl", ".off", ".svg", ".dxf"] as const;
export const PROJECT_FILE_EXTENSIONS = [...SCAD_EXTENSIONS, ...ASSET_EXTENSIONS] as const;

const DEFAULT_CODE = `// OpenSCAD: hollow cube shell
difference() {
  cube([40, 40, 40], center=true);
  translate([0, 0, 4])
    cube([32, 32, 32], center=true);
}`;

export function createDefaultProject(): BrowserProject {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: "Untitled Project",
    activeFilePath: "main.scad",
    files: [{ path: "main.scad", kind: "scad", content: DEFAULT_CODE }],
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeProjectPath(input: string, fallbackExtension = ".scad") {
  const fileName = input
    .trim()
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean)
    .at(-1)
    ?.replace(/[<>:"|?*]/g, "-")
    .replaceAll(/\p{Cc}/gu, "-")
    .replace(/^\.+/, "")
    .trim();

  if (!fileName) return "";

  const hasExtension = /\.[A-Za-z0-9]+$/.test(fileName);
  return hasExtension ? fileName : `${fileName}${fallbackExtension}`;
}

export function getProjectFileKind(path: string): ProjectFileKind | null {
  const extension = getFileExtension(path);
  if (extension === ".scad") return "scad";
  if ((ASSET_EXTENSIONS as readonly string[]).includes(extension)) return "asset";
  return null;
}

export function getFileExtension(path: string) {
  const match = path.toLowerCase().match(/\.[^.]+$/);
  return match?.[0] ?? "";
}

export function ensureUniquePath(path: string, files: readonly ProjectFile[], ignorePath?: string) {
  const normalized = normalizeProjectPath(path, getFileExtension(path) || ".scad");
  if (!normalized) return "";

  const existing = new Set(
    files
      .filter((file) => file.path !== ignorePath)
      .map((file) => file.path.toLowerCase()),
  );
  if (!existing.has(normalized.toLowerCase())) return normalized;

  const extension = getFileExtension(normalized);
  const stem = extension ? normalized.slice(0, -extension.length) : normalized;
  let index = 2;
  let candidate = `${stem}-${index}${extension}`;
  while (existing.has(candidate.toLowerCase())) {
    index += 1;
    candidate = `${stem}-${index}${extension}`;
  }
  return candidate;
}

export function getActiveFile(project: BrowserProject) {
  return project.files.find((file) => file.path === project.activeFilePath) ?? project.files[0] ?? null;
}

export function getActiveTextFile(project: BrowserProject) {
  const active = getActiveFile(project);
  return active?.kind === "scad" ? active : null;
}
