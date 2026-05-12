import { useRef } from "react";
import {
  Box,
  Copy,
  FileCode,
  FilePlus2,
  FolderPlus,
  Image,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@ise-studio/ui/menubar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ise-studio/ui/select";
import { Separator } from "@ise-studio/ui/separator";
import {
  ASSET_EXTENSIONS,
  type BrowserProject,
  type ProjectFile,
  type ProjectMutation,
  ensureUniquePath,
  getFileExtension,
  normalizeProjectPath,
} from "@ise-studio/core/project";

interface FileExplorerProps {
  projects: BrowserProject[];
  activeProject: BrowserProject;
  activeProjectId: string;
  isSaving?: boolean;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
  onMutateProject: (mutation: ProjectMutation) => void;
}

export function FileExplorer({
  projects,
  activeProject,
  activeProjectId,
  isSaving = false,
  onSelectProject,
  onCreateProject,
  onMutateProject,
}: FileExplorerProps) {
  const assetInputRef = useRef<HTMLInputElement | null>(null);
  const selectedFile = activeProject.files.find((file) => file.path === activeProject.activeFilePath);

  const createScadFile = () => {
    const rawName = window.prompt("New OpenSCAD file name", "part.scad");
    if (!rawName) return;
    const path = normalizeProjectPath(rawName, ".scad");
    if (!path.endsWith(".scad")) {
      toast.error("OpenSCAD files must use the .scad extension.");
      return;
    }
    onMutateProject({ type: "create-file", path });
  };

  const renameFile = () => {
    if (!selectedFile) return;
    const rawName = window.prompt("Rename file", selectedFile.path);
    if (!rawName || rawName === selectedFile.path) return;

    const path = normalizeProjectPath(rawName, getFileExtension(selectedFile.path));
    if (!path) return;
    onMutateProject({ type: "rename-file", oldPath: selectedFile.path, newPath: path });
  };

  const duplicateFile = () => {
    if (!selectedFile) return;
    const extension = getFileExtension(selectedFile.path);
    const stem = selectedFile.path.slice(0, -extension.length);
    const targetPath = ensureUniquePath(`${stem}-copy${extension}`, activeProject.files);
    onMutateProject({ type: "duplicate-file", sourcePath: selectedFile.path, targetPath });
  };

  const deleteFile = () => {
    if (!selectedFile) return;
    if (activeProject.files.length <= 1) {
      toast.error("A project needs at least one file.");
      return;
    }
    if (!window.confirm(`Delete ${selectedFile.path}?`)) return;
    onMutateProject({ type: "delete-file", path: selectedFile.path });
  };

  const renameProject = () => {
    const name = window.prompt("Project name", activeProject.name);
    if (!name) return;
    onMutateProject({ type: "rename-project", name });
  };

  const addAssets = async (fileList: FileList | null) => {
    if (!fileList) return;
    for (const file of Array.from(fileList)) {
      const path = normalizeProjectPath(file.name, getFileExtension(file.name));
      if (!ASSET_EXTENSIONS.includes(getFileExtension(path) as (typeof ASSET_EXTENSIONS)[number])) {
        toast.error(`${file.name} is not a supported import asset.`);
        continue;
      }
      onMutateProject({ type: "add-asset", path, content: file });
    }
    if (assetInputRef.current) assetInputRef.current.value = "";
  };

  return (
    <div className="bg-muted/30 flex min-h-10 items-center gap-2 overflow-x-auto border-b px-2 py-1.5">
      <Select value={activeProjectId} onValueChange={onSelectProject}>
        <SelectTrigger className="h-8 w-44 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={activeProject.activeFilePath}
        onValueChange={(path) => onMutateProject({ type: "set-active-file", path })}
      >
        <SelectTrigger className="h-8 min-w-36 flex-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {activeProject.files
            .slice()
            .sort(compareFiles)
            .map((file) => (
              <SelectItem key={file.path} value={file.path}>
                <span className="flex min-w-0 items-center gap-2">
                  <FileIcon file={file} />
                  <span className="truncate">{file.path}</span>
                </span>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Menubar className="h-8 shrink-0 border-0 bg-transparent p-0 shadow-none">
        <MenubarMenu>
          <MenubarTrigger aria-label="Project actions" className="h-8 w-8 justify-center px-0">
            <FolderPlus className="h-4 w-4" />
          </MenubarTrigger>
          <MenubarContent>
            <MenubarItem onSelect={onCreateProject}>
              <FolderPlus className="h-4 w-4" />
              New project
            </MenubarItem>
            <MenubarItem onSelect={renameProject}>
              <Pencil className="h-4 w-4" />
              Rename project
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger aria-label="File actions" className="h-8 w-8 justify-center px-0">
            <FileCode className="h-4 w-4" />
          </MenubarTrigger>
          <MenubarContent>
            <MenubarItem onSelect={createScadFile}>
              <FilePlus2 className="h-4 w-4" />
              New .scad file
            </MenubarItem>
            <MenubarItem onSelect={() => assetInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Import asset
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem disabled={!selectedFile} onSelect={renameFile}>
              <Pencil className="h-4 w-4" />
              Rename file
            </MenubarItem>
            <MenubarItem disabled={!selectedFile} onSelect={duplicateFile}>
              <Copy className="h-4 w-4" />
              Duplicate file
            </MenubarItem>
            <MenubarItem disabled={!selectedFile} variant="destructive" onSelect={deleteFile}>
              <Trash2 className="h-4 w-4" />
              Delete file
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      <span className="ml-auto hidden shrink-0 text-xs text-muted-foreground xl:inline">
        {activeProject.files.length} files · {isSaving ? "Saving..." : "Saved"}
      </span>

      <input
        ref={assetInputRef}
        accept={ASSET_EXTENSIONS.join(",")}
        className="hidden"
        multiple
        onChange={(event) => void addAssets(event.target.files)}
        type="file"
      />
    </div>
  );
}

function FileIcon({ file }: { file: ProjectFile }) {
  if (file.kind === "scad") return <FileCode className="h-4 w-4 shrink-0" />;
  const extension = getFileExtension(file.path);
  if (extension === ".stl" || extension === ".off") return <Box className="h-4 w-4 shrink-0" />;
  if (extension === ".svg" || extension === ".dxf") return <Image className="h-4 w-4 shrink-0" />;
  return <FileCode className="h-4 w-4 shrink-0" />;
}

function compareFiles(a: ProjectFile, b: ProjectFile) {
  if (a.kind !== b.kind) return a.kind === "scad" ? -1 : 1;
  return a.path.localeCompare(b.path);
}
