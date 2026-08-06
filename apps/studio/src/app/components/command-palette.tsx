import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AlignLeft, Archive, Code2, Copy, Download, FilePlus2, Library, Play, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@ise-studio/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@ise-studio/ui/dialog";
import { Input } from "@ise-studio/ui/input";
import { cn } from "@ise-studio/ui/utils";
import {
  getRegisteredStudioExtensions,
  subscribeToStudioExtensions,
} from "@ise-studio/ui/studio-extensions";
import { buildCodeShareUrl, exportProjectArchive, importProjectArchive, importScadFile } from "../file-io";
import {
  COMPILE_PREVIEW_EVENT,
  EXPORT_SCAD_EVENT,
  FOCUS_EDITOR_EVENT,
  FORMAT_DOCUMENT_EVENT,
  OPEN_COMMAND_PALETTE_EVENT,
  OPEN_LIBRARY_BROWSER_EVENT,
  OPEN_SETTINGS_EVENT,
} from "@ise-studio/ui/studio-events";

interface CommandPaletteProps {
  code: string;
  fileName: string;
  onCodeChange: (code: string) => void;
  onFileNameChange: (fileName: string) => void;
}

interface Command {
  id: string;
  label: string;
  hint: string;
  icon: typeof Code2;
  run: () => void | Promise<void>;
}

export function CommandPalette({ code, fileName, onCodeChange, onFileNameChange }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const extensions = useSyncExternalStore(
    subscribeToStudioExtensions,
    getRegisteredStudioExtensions,
    getRegisteredStudioExtensions,
  );

  useEffect(() => {
    const openPalette = () => setOpen(true);
    const keydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, openPalette);
    window.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, openPalette);
      window.removeEventListener("keydown", keydown);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    queueMicrotask(() => inputRef.current?.focus());
  }, [open]);

  const commands = useMemo<Command[]>(
    () => [
      {
        id: "compile",
        label: "Compile preview",
        hint: "Run OpenSCAD in the worker",
        icon: Play,
        run: () => window.dispatchEvent(new Event(COMPILE_PREVIEW_EVENT)),
      },
      {
        id: "focus-editor",
        label: "Focus editor",
        hint: "Return to the code canvas",
        icon: Code2,
        run: () => window.dispatchEvent(new Event(FOCUS_EDITOR_EVENT)),
      },
      {
        id: "format",
        label: "Format document",
        hint: "Indent OpenSCAD blocks",
        icon: AlignLeft,
        run: () => window.dispatchEvent(new Event(FORMAT_DOCUMENT_EVENT)),
      },
      {
        id: "import",
        label: "Import .scad file",
        hint: "Open a local OpenSCAD document",
        icon: FilePlus2,
        run: async () => {
          try {
            const result = await importScadFile();
            if (result) {
              onCodeChange(result.code);
              onFileNameChange(result.fileName);
            }
          } catch (error) {
            toast.error("Could not import the SCAD file", { description: error instanceof Error ? error.message : "File access failed." });
          }
        },
      },
      {
        id: "import-archive",
        label: "Import project archive",
        hint: "Restore an .ise.zip document",
        icon: Archive,
        run: async () => {
          try {
            const result = await importProjectArchive();
            if (result) {
              onCodeChange(result.code);
              onFileNameChange(result.fileName);
            }
          } catch (error) {
            toast.error("Could not import the project archive", { description: error instanceof Error ? error.message : "Archive access failed." });
          }
        },
      },
      {
        id: "export",
        label: "Export .scad file",
        hint: "Save the active document locally",
        icon: Download,
        run: () => window.dispatchEvent(new Event(EXPORT_SCAD_EVENT)),
      },
      {
        id: "share",
        label: "Copy share link",
        hint: "Encode the current source in the URL",
        icon: Copy,
        run: async () => {
          try {
            await navigator.clipboard.writeText(buildCodeShareUrl(code));
            toast.success("Share link copied");
          } catch {
            toast.error("Clipboard access is unavailable");
          }
        },
      },
      {
        id: "export-archive",
        label: "Export project archive",
        hint: "Save a portable .ise.zip document",
        icon: Archive,
        run: () => exportProjectArchive(code, fileName),
      },
      {
        id: "library",
        label: "Browse bundled libraries",
        hint: "Insert a bundled include into the editor",
        icon: Library,
        run: () => window.dispatchEvent(new Event(OPEN_LIBRARY_BROWSER_EVENT)),
      },
      {
        id: "settings",
        label: "Open settings",
        hint: "AI, theme, and editor preferences",
        icon: Settings2,
        run: () => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT)),
      },
      ...extensions.flatMap((extension) =>
        (extension.commands ?? []).map((command) => ({
          ...command,
          id: `${extension.id}:${command.id}`,
          hint: `${extension.name} · ${command.hint}`,
          icon: Code2,
        })),
      ),
    ],
    [code, extensions, fileName, onCodeChange, onFileNameChange],
  );

  const filteredCommands = commands.filter((command) =>
    `${command.label} ${command.hint}`.toLowerCase().includes(query.toLowerCase()),
  );

  const runCommand = async (command?: Command) => {
    if (!command) return;
    setOpen(false);
    await command.run();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle>Command palette</DialogTitle>
          <DialogDescription>Navigate ISE Studio without leaving the keyboard.</DialogDescription>
        </DialogHeader>
        <div className="p-3">
          <Input
            ref={inputRef}
            aria-label="Search commands"
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((index) => Math.min(index + 1, filteredCommands.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) => Math.max(index - 1, 0));
              } else if (event.key === "Enter") {
                event.preventDefault();
                void runCommand(filteredCommands[activeIndex]);
              }
            }}
            placeholder="Type a command…"
            value={query}
          />
        </div>
        <div className="max-h-80 overflow-y-auto px-2 pb-2">
          {filteredCommands.length === 0 ? (
            <p className="text-muted-foreground px-3 py-8 text-center text-sm">No matching commands.</p>
          ) : (
            filteredCommands.map((command, index) => {
              const Icon = command.icon;
              return (
                <Button
                  className={cn("h-auto w-full justify-start gap-3 px-3 py-2.5 text-left", index === activeIndex && "bg-accent")}
                  key={command.id}
                  onClick={() => void runCommand(command)}
                  variant="ghost"
                >
                  <Icon className="text-muted-foreground size-4" />
                  <span className="flex min-w-0 flex-col items-start">
                    <span>{command.label}</span>
                    <span className="text-muted-foreground text-xs font-normal">{command.hint}</span>
                  </span>
                </Button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
