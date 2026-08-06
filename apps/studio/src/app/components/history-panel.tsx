import { RotateCcw, History } from "lucide-react";

import { Button } from "@ise-studio/ui/button";
import type { StudioHistoryEntry } from "../use-studio-history";

export function HistoryPanel({ entries, onRestore }: { entries: StudioHistoryEntry[]; onRestore: (code: string) => void }) {
  if (entries.length === 0) return null;
  return (
    <details className="border-t">
      <summary className="hover:bg-accent/40 flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-medium">
        <span className="flex items-center gap-2"><History className="size-3.5" />History</span>
        <span className="text-muted-foreground font-mono">{entries.length}</span>
      </summary>
      <div className="max-h-36 overflow-y-auto px-2 pb-2">
        {entries.slice(0, 8).map((entry) => (
          <div className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-xs" key={entry.id}>
            <span className="text-muted-foreground truncate">
              {entry.reason === "preview" ? "Successful preview" : "Code edit"} · {new Date(entry.createdAt).toLocaleTimeString()}
            </span>
            <Button aria-label="Restore version" onClick={() => onRestore(entry.code)} size="icon" variant="ghost"><RotateCcw className="size-3.5" /></Button>
          </div>
        ))}
      </div>
    </details>
  );
}
