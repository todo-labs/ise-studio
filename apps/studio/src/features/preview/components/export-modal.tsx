import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@ise-studio/ui/alert-dialog";
import { Progress } from "@ise-studio/ui/progress";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { compileOpenSCADProject } from "@ise-studio/core/openscad";
import type { ProjectFile } from "@ise-studio/core/project";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: ProjectFile[];
  entryPath: string | null;
  fileName: string;
}

export function ExportModal({ isOpen, onClose, files, entryPath, fileName }: ExportModalProps) {
  const [status, setStatus] = useState<"idle" | "exporting" | "saving" | "completed" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Preparing export...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && status === "idle") {
      handleExport();
    }
  }, [isOpen]);

  const handleExport = async () => {
    setStatus("exporting");
    setProgress(0);
    setStatusText("Rendering STL...");

    try {
      const entryFile = files.find((file) => file.path === entryPath && file.kind === "scad");
      if (!entryFile) {
        throw new Error("Select a .scad file before exporting STL.");
      }

      const result = await compileOpenSCADProject({
        files: files.map((file) => ({
          path: file.path,
          content: file.content,
        })),
        entryPath: entryFile.path,
        format: "stl",
        onProgress: (percent, status) => {
          setProgress(percent);
          setStatusText(`${status} (${percent}%)...`);
        },
      });

      if (!result.geometry) {
        const errorDetail = result.stderr ? `\n\nDetails:\n${result.stderr}` : "";
        throw new Error(`No geometry produced (Exit code: ${result.exitCode})${errorDetail}`);
      }

      setStatus("saving");
      setStatusText("Opening save dialog...");

      const blob = new Blob([result.geometry.buffer as ArrayBuffer], {
        type: "application/octet-stream",
      });
      const downloadName = fileName.replace(/\.scad$/, "") + ".stl";

      // Attempt to use File System Access API if available
      if ("showSaveFilePicker" in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: downloadName,
            types: [
              {
                description: "STL File",
                accept: { "application/octet-stream": [".stl"] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          setStatus("completed");
        } catch (err: any) {
          if (err.name === "AbortError") {
            // User cancelled save dialog, just reset to completed so they can close or try again
            setStatus("completed");
            setStatusText("Save cancelled by user.");
          } else {
            throw err;
          }
        }
      } else {
        // Fallback for browsers that don't support showSaveFilePicker
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Delay revocation to ensure browser has started the download
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
        
        setStatus("completed");
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "An unknown error occurred");
    }
  };

  const resetAndClose = () => {
    setStatus("idle");
    setProgress(0);
    setErrorMessage(null);
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => {
      // Prevent closing while exporting/saving unless there's an error or it's completed
      if (!open && (status === "completed" || status === "error")) {
        resetAndClose();
      }
    }}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {status === "error" ? "Export Failed" : status === "completed" ? "Export Complete" : "Exporting STL"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {status === "error" ? "Something went wrong during the export process." : "Please wait while we render your model."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-6">
          {(status === "exporting" || status === "saving") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">{statusText}</span>
                <span className="font-bold">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-center pt-2">
                <Loader2 className="text-primary h-6 w-6 animate-spin" />
              </div>
            </div>
          )}

          {status === "completed" && (
            <div className="flex flex-col items-center space-y-3 py-2 text-center">
              <div className="bg-primary/10 rounded-full p-3">
                <CheckCircle2 className="text-primary h-8 w-8" />
              </div>
              <p className="text-sm font-medium">Model successfully exported!</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center space-y-3 py-2 text-center">
              <div className="bg-destructive/10 rounded-full p-3">
                <XCircle className="text-destructive h-8 w-8" />
              </div>
              <div className="bg-muted w-full max-h-[200px] overflow-auto rounded-md p-2 text-left">
                <pre className="text-destructive whitespace-pre-wrap text-[10px] font-mono leading-tight">
                  {errorMessage}
                </pre>
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          {(status === "completed" || status === "error") && (status === "error" ? (
            <AlertDialogAction onClick={resetAndClose} variant="destructive">
              Close
            </AlertDialogAction>
          ) : (
            <AlertDialogAction onClick={resetAndClose}>
              Close
            </AlertDialogAction>
          ))}
          {(status === "exporting" || status === "saving") && (
            <p className="text-muted-foreground w-full text-center text-xs">
              This may take a few moments depending on model complexity.
            </p>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
