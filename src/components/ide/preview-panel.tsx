import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { DSLViewer } from "./dsl-viewer";
import { evaluateDSL } from "@/lib/dsl";
import type { DSLNode } from "@/lib/dsl";
import { Eye, Square, Play, AlertCircle, Loader2, Download } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PreviewPanelProps {
  code: string;
  fileName: string;
  onCompileReady?: (compileFunction: () => void) => void;
}

export function PreviewPanel({ code, fileName, onCompileReady }: PreviewPanelProps) {
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<DSLNode | null>(null);
  const [scadSource, setScadSource] = useState("");
  const [showWireframe, setShowWireframe] = useState(false);
  const [lastCompiledAt, setLastCompiledAt] = useState<Date | null>(null);

  const handleCompile = useCallback(() => {
    if (!code.trim()) {
      setError("No code to compile");
      setModel(null);
      setScadSource("");
      return;
    }

    setIsCompiling(true);
    setError(null);

    try {
      const result = evaluateDSL(code);
      if (!result.node) {
        setModel(null);
        setScadSource("");
        setError(result.error ?? "Failed to build model");
        return;
      }

      setModel(result.node);
      setScadSource(result.scadSource ?? "");
      setLastCompiledAt(new Date());
    } catch (err) {
      setModel(null);
      setScadSource("");
      setError(err instanceof Error ? err.message : "Compilation failed");
    } finally {
      setIsCompiling(false);
    }
  }, [code]);

  useEffect(() => {
    if (!onCompileReady) return;
    const compileWrapper = () => {
      handleCompile();
    };
    onCompileReady(compileWrapper);
  }, [handleCompile, onCompileReady]);

  const handleExportSCAD = () => {
    if (!scadSource) {
      setError("Nothing to export yet");
      return;
    }

    const blob = new Blob([scadSource], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const downloadName = fileName.endsWith(".scad") ? fileName : `${fileName}.scad`;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGeometryError = useCallback((message: string) => {
    setError(message);
  }, []);

  return (
    <div className="bg-background flex h-full flex-col">
      <div className="bg-muted/30 flex items-center justify-between border-b p-2">
        <div className="flex items-center space-x-2">
          <Eye className="h-4 w-4" />
          <span className="text-sm font-medium">Preview</span>
          <Badge variant="secondary" className="text-xs">
            DSL Renderer
          </Badge>
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
                  aria-label={isCompiling ? "Compiling DSL" : "Compile DSL"}
                  disabled={isCompiling || !code.trim()}
                  onClick={handleCompile}
                  size="icon"
                  variant="default"
                >
                  {isCompiling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isCompiling ? "Compiling..." : "Compile DSL"}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label="Export .scad"
                  disabled={!scadSource}
                  onClick={handleExportSCAD}
                  size="icon"
                  variant="outline"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export .scad</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border-b p-2">
          <div className="flex items-center space-x-2">
            <AlertCircle className="text-destructive h-4 w-4" />
            <span className="text-destructive text-sm">{error}</span>
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
                <p className="mb-4 text-sm">Write some DSL code to see the preview</p>
                <div className="text-muted-foreground text-xs">
                  Try:{" "}
                  <code className="bg-muted rounded px-1">
                    {"render(cube({ size: 20, center: true }));"}
                  </code>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="m-2 flex min-h-0 flex-1 overflow-hidden rounded-lg border bg-background">
            <div className="relative min-h-0 flex-1 w-full">
              <DSLViewer
                node={model}
                showWireframe={showWireframe}
                className="h-full min-h-0 w-full"
                onGeometryError={handleGeometryError}
              />
              {isCompiling && (
                <div className="bg-background/80 absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-sm">Compiling DSL code...</p>
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
              Last compiled:{" "}
              {lastCompiledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            {showWireframe && <span>Wireframe enabled</span>}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span>Changes aren&apos;t live — hit Compile to update the view.</span>
            {showWireframe && <span>Wireframe enabled</span>}
          </div>
        )}
      </div>
    </div>
  );
}
