import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { SCADViewer } from "./scad-viewer";
import { compileOpenSCAD, terminateOpenSCAD } from "@/lib/openscad-runner";
import type { CompileResult } from "@/lib/openscad-runner";
import { Eye, Square, Play, AlertCircle, Loader2, Download, FileCode } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { ExportModal } from "./export-modal";

import { toast } from "sonner";

interface PreviewPanelProps {
  code: string;
  fileName: string;
  onCompileReady?: (compileFunction: () => void) => void;
  autoPreview?: boolean;
}

export function PreviewPanel({ code, fileName, onCompileReady, autoPreview = true }: PreviewPanelProps) {
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geometryData, setGeometryData] = useState<Uint8Array | null>(null);
  const [geometryFormat, setGeometryFormat] = useState<"stl" | "off">("stl");
  const [showWireframe, setShowWireframe] = useState(false);
  const [lastCompiledAt, setLastCompiledAt] = useState<Date | null>(null);
  const [isWasmReady, setIsWasmReady] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      terminateOpenSCAD();
    };
  }, []);

  const handleCompile = useCallback(async () => {
    if (!code.trim()) {
      setError("No code to compile");
      setGeometryData(null);
      return;
    }

    setIsCompiling(true);
    setError(null);

    try {
      const result: CompileResult = await compileOpenSCAD(code, {
        format: "off",
        preview: true,
        fileName,
      });

      if (result.exitCode !== 0 && !result.geometry) {
        const errorText = result.stderr.trim() || `Compilation failed (exit code ${result.exitCode})`;
        setError(errorText);
        setGeometryData(null);
        return;
      }

      if (!result.geometry) {
        setError("No geometry produced");
        setGeometryData(null);
        return;
      }

      setGeometryData(result.geometry);
      setGeometryFormat(result.format);
      setLastCompiledAt(new Date());
      setIsWasmReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compilation failed");
      setGeometryData(null);
    } finally {
      setIsCompiling(false);
    }
  }, [code, fileName]);

  useEffect(() => {
    if (!onCompileReady) return;
    onCompileReady(() => {
      handleCompile();
    });
  }, [handleCompile, onCompileReady]);

  useEffect(() => {
    if (!autoPreview || !code.trim()) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      handleCompile();
    }, 1500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [code, autoPreview, handleCompile]);

  const handleExportSTL = () => {
    if (!code.trim()) {
      setError("Nothing to export");
      return;
    }
    setIsExportModalOpen(true);
  };

  const handleExportSCAD = () => {
    if (!code.trim()) {
      setError("Nothing to export");
      return;
    }

    try {
      console.log("Starting SCAD export...");
      const blob = new Blob([code], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const downloadName = fileName.endsWith(".scad") ? fileName : `${fileName}.scad`;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Delay revocation to ensure browser has started the download
      setTimeout(() => {
        URL.revokeObjectURL(url);
        console.log("SCAD blob URL revoked");
      }, 1000);
      
      toast.success("SCAD file exported successfully", {
        description: `Saved as ${downloadName}`
      });
    } catch (err) {
      console.error("SCAD export failed:", err);
      toast.error("Failed to export SCAD file");
    }
  };

  const handleError = useCallback((message: string) => {
    setError(message);
  }, []);

  return (
    <div className="bg-background flex h-full flex-col">
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        code={code}
        fileName={fileName}
      />
      <div className="bg-muted/30 flex items-center justify-between border-b p-2">
        <div className="flex items-center space-x-2">
          <Eye className="h-4 w-4" />
          <span className="text-sm font-medium">Preview</span>
        </div>

        <div className="flex items-center space-x-1">
          <Toggle
            pressed={showWireframe}
            onPressedChange={setShowWireframe}
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
                  aria-label={isCompiling ? "Rendering..." : "Render (F5)"}
                  disabled={isCompiling || !code.trim()}
                  onClick={handleCompile}
                  size="icon"
                  variant="default"
                >
                  {isCompiling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isCompiling ? "Rendering..." : "Render (F5)"}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label="Export .scad"
                  disabled={!code.trim()}
                  onClick={handleExportSCAD}
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
                  disabled={!code.trim() || isCompiling}
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

      {error && (
        <div className="bg-destructive/10 border-b p-2">
          <div className="flex items-start space-x-2">
            <AlertCircle className="text-destructive mt-0.5 h-4 w-4 shrink-0" />
            <pre className="text-destructive whitespace-pre-wrap text-xs">{error}</pre>
          </div>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col">
        {!code.trim() ? (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center">
            <div className="space-y-4 text-center">
              <div className="bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-full">
                <Eye className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-foreground mb-2 text-lg font-medium">No Preview Available</h3>
                <p className="mb-4 text-sm">Write some OpenSCAD code to see the preview</p>
                <div className="text-muted-foreground text-xs">
                  Try:{" "}
                  <code className="bg-muted rounded px-1">
                    {"cube([20, 20, 20], center=true);"}
                  </code>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="m-2 flex min-h-0 flex-1 overflow-hidden rounded-lg border bg-background">
            <div className="relative min-h-0 flex-1 w-full">
              <SCADViewer
                data={geometryData}
                format={geometryFormat}
                showWireframe={showWireframe}
                className="h-full min-h-0 w-full"
                onError={handleError}
              />
              {isCompiling && (
                <div className="bg-background/80 absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-sm">
                      {isWasmReady ? "Rendering with OpenSCAD..." : "Loading OpenSCAD WASM engine..."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-muted/30 border-t p-3 text-xs text-muted-foreground">
        {lastCompiledAt ? (
          <div className="flex items-center justify-between">
            <span>
              Last rendered:{" "}
              {lastCompiledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <div className="flex items-center space-x-3">
              {autoPreview && <span>Auto-preview on</span>}
              {showWireframe && <span>Wireframe enabled</span>}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span>
              {autoPreview
                ? "Auto-preview enabled — code changes will render automatically."
                : "Hit Render to update the view."}
            </span>
            {showWireframe && <span>Wireframe enabled</span>}
          </div>
        )}
      </div>
    </div>
  );
}
