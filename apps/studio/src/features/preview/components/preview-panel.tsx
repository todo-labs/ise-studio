import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2, Play, RotateCcw, TriangleAlert } from "lucide-react";

import { Badge } from "@ise-studio/ui/badge";
import { Button } from "@ise-studio/ui/button";
import { cn } from "@ise-studio/ui/utils";
import { SCADViewer } from "./scad-viewer";
import { ExportModal } from "./export-modal";
import { usePreviewWorkflow } from "../preview-workflow";
import { CustomizerPanel } from "./customizer-panel";
import { COMPILE_PREVIEW_EVENT } from "@ise-studio/ui/studio-events";

interface PreviewPanelProps {
  code: string;
  fileName: string;
  onCodeChange: (code: string) => void;
  onSuccessfulCompile?: () => void;
}

export function PreviewPanel({ code, fileName, onCodeChange, onSuccessfulCompile }: PreviewPanelProps) {
  const [showExport, setShowExport] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const source = useMemo(() => ({ path: fileName, content: code }), [code, fileName]);
  const workflow = usePreviewWorkflow({
    source,
    fileName,
    autoPreview: true,
  });
  const reportViewerError = useCallback((message: string) => setViewerError(message), []);

  useEffect(() => {
    const compile = () => void workflow.renderPreview();
    window.addEventListener(COMPILE_PREVIEW_EVENT, compile);
    return () => {
      window.removeEventListener(COMPILE_PREVIEW_EVENT, compile);
    };
  }, [workflow.exportSCAD, workflow.renderPreview]);

  useEffect(() => {
    if (workflow.lastCompiledAt) onSuccessfulCompile?.();
  }, [onSuccessfulCompile, workflow.lastCompiledAt]);

  return (
    <div className="bg-muted/10 flex h-full min-w-0 flex-col">
      <CustomizerPanel code={code} onCodeChange={onCodeChange} />
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Preview</span>
          {workflow.isCompiling && <Badge variant="secondary">Compiling</Badge>}
          {workflow.isWasmReady && !workflow.isCompiling && <Badge variant="outline">WASM ready</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <Button
            aria-label="Compile preview"
            disabled={!workflow.canRender || workflow.isCompiling}
            onClick={() => void workflow.renderPreview()}
            size="icon"
            title="Compile preview"
            variant="ghost"
          >
            {workflow.isCompiling ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          </Button>
          <Button
            aria-label="Export OpenSCAD source"
            disabled={!workflow.canExport}
            onClick={workflow.exportSCAD}
            size="icon"
            title="Export .scad"
            variant="ghost"
          >
            <Download className="size-4" />
          </Button>
          <Button
            aria-label="Export STL"
            disabled={!workflow.canExport || workflow.isCompiling}
            onClick={() => setShowExport(true)}
            size="icon"
            title="Export .stl"
            variant="ghost"
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button
            aria-label="Toggle wireframe"
            aria-pressed={workflow.showWireframe}
            onClick={() => workflow.setShowWireframe((current) => !current)}
            size="icon"
            title="Toggle wireframe"
            variant={workflow.showWireframe ? "secondary" : "ghost"}
          >
            <span className="text-xs">WF</span>
          </Button>
        </div>
      </div>

      {workflow.error || viewerError ? (
        <div className="border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <div className="flex gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <pre className="max-h-28 overflow-auto whitespace-pre-wrap font-sans">
              {workflow.error ?? viewerError}
            </pre>
          </div>
        </div>
      ) : null}

      <div className={cn("relative min-h-0 flex-1", !workflow.geometryData && "grid place-items-center")}>
        {workflow.geometryData ? (
          <SCADViewer
            geometryData={workflow.geometryData}
            geometryFormat={workflow.geometryFormat}
            onError={reportViewerError}
            showWireframe={workflow.showWireframe}
          />
        ) : (
          <p className="text-muted-foreground px-6 text-center text-sm">
            {workflow.isCompiling ? "Compiling OpenSCAD…" : "Compile a model to see its preview."}
          </p>
        )}
      </div>

      {workflow.lastCompiledAt && (
        <div className="text-muted-foreground border-t px-3 py-1.5 text-right text-[11px]">
          Last successful compile {workflow.lastCompiledAt.toLocaleTimeString()}
        </div>
      )}

      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        operation={workflow.exportSTLOperation}
      />
    </div>
  );
}

export const STLPreviewPanel = PreviewPanel;
