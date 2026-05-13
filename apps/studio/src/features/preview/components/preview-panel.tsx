import { useCallback, useState } from "react";
import { AlertCircle, Download, Eye, FileCode, Loader2, Play, Square } from "lucide-react";

import { Button } from "@ise-studio/ui/button";
import { Separator } from "@ise-studio/ui/separator";
import { Toggle } from "@ise-studio/ui/toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@ise-studio/ui/tooltip";
import type { ProjectFile } from "@ise-studio/project";

import { ExportModal } from "./export-modal";
import { SCADViewer } from "./scad-viewer";
import { usePreviewWorkflow } from "../preview-workflow";

interface PreviewPanelProps {
  files: ProjectFile[];
  entryPath: string | null;
  fileName: string;
  autoPreview?: boolean;
}

export function PreviewPanel({
  files,
  entryPath,
  fileName,
  autoPreview = true,
}: PreviewPanelProps) {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const preview = usePreviewWorkflow({ files, entryPath, fileName, autoPreview });

  const handleExportSTL = () => {
    if (!preview.canExport) {
      preview.setError("Nothing to export");
      return;
    }
    setIsExportModalOpen(true);
  };

  const handleError = useCallback((message: string) => {
    preview.setError(message);
  }, [preview]);

  return (
    <div className="bg-background flex h-full flex-col">
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        operation={preview.exportSTLOperation}
      />
      <div className="bg-muted/30 flex items-center justify-between border-b p-2">
        <div className="flex items-center space-x-2">
          <Eye className="h-4 w-4" />
          <span className="text-sm font-medium">Preview</span>
        </div>

        <div className="flex items-center space-x-1">
          <Toggle
            pressed={preview.showWireframe}
            onPressedChange={preview.setShowWireframe}
            size="sm"
            aria-label="Toggle wireframe"
          >
            <Square className="h-4 w-4" />
          </Toggle>

          <Separator orientation="vertical" className="h-6" />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label={preview.isCompiling ? "Rendering..." : "Render (F5)"}
                  disabled={preview.isCompiling || !preview.canRender}
                  onClick={preview.renderPreview}
                  size="icon"
                  variant="default"
                >
                  {preview.isCompiling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{preview.isCompiling ? "Rendering..." : "Render (F5)"}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label="Export .scad"
                  disabled={!entryPath}
                  onClick={preview.exportSCAD}
                  size="icon"
                  variant="outline"
                >
                  <FileCode className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export .scad</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label="Export .stl"
                  disabled={!entryPath || preview.isCompiling}
                  onClick={handleExportSTL}
                  size="icon"
                  variant="outline"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export .stl</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {preview.error && (
        <div className="bg-destructive/10 border-b p-2">
          <div className="flex items-start space-x-2">
            <AlertCircle className="text-destructive mt-0.5 h-4 w-4 shrink-0" />
            <pre className="text-destructive whitespace-pre-wrap text-xs">{preview.error}</pre>
          </div>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col">
        {!entryPath ? (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center">
            <div className="space-y-4 text-center">
              <div className="bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-full">
                <Eye className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-foreground mb-2 text-lg font-medium">No .scad File Selected</h3>
                <p className="mb-4 text-sm">Select or create an OpenSCAD file to render the project.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="m-2 flex min-h-0 flex-1 overflow-hidden rounded-lg border bg-background">
            <div className="relative min-h-0 w-full flex-1">
              <SCADViewer
                data={preview.geometryData}
                format={preview.geometryFormat}
                showWireframe={preview.showWireframe}
                className="h-full min-h-0 w-full"
                onError={handleError}
              />
              {preview.isCompiling && (
                <div className="bg-background/80 absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-sm">
                      {preview.isWasmReady ? "Rendering with OpenSCAD..." : "Loading OpenSCAD WASM engine..."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-muted/30 border-t p-3 text-xs text-muted-foreground">
        {preview.lastCompiledAt ? (
          <div className="flex items-center justify-between">
            <span>
              Last rendered:{" "}
              {preview.lastCompiledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <div className="flex items-center space-x-3">
              {autoPreview && <span>Auto-preview on</span>}
              {preview.showWireframe && <span>Wireframe enabled</span>}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span>
              {autoPreview
                ? "Auto-preview enabled - code changes will render automatically."
                : "Hit Render to update the view."}
            </span>
            {preview.showWireframe && <span>Wireframe enabled</span>}
          </div>
        )}
      </div>
    </div>
  );
}
