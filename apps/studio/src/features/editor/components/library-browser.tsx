import { useEffect, useMemo, useState } from "react";
import { BookOpen, Copy, Search } from "lucide-react";

import { getOpenSCADLibraryAliases } from "@ise-studio/openscad";
import { Button } from "@ise-studio/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@ise-studio/ui/dialog";
import { Input } from "@ise-studio/ui/input";
import { OPEN_LIBRARY_BROWSER_EVENT } from "@ise-studio/ui/studio-events";

interface LibraryBrowserProps {
  code: string;
  onCodeChange: (code: string) => void;
}

const EXAMPLE_PATHS: Record<string, string> = {
  BOSL2: "BOSL2/std.scad",
  BOSL: "BOSL/constants.scad",
  MCAD: "MCAD/boxes.scad",
  NopSCADlib: "NopSCADlib/core.scad",
  funcutils: "funcutils/funcutils.scad",
};

export function LibraryBrowser({ code, onCodeChange }: LibraryBrowserProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const aliases = useMemo(() => getOpenSCADLibraryAliases(), []);

  useEffect(() => {
    const openBrowser = () => setOpen(true);
    window.addEventListener(OPEN_LIBRARY_BROWSER_EVENT, openBrowser);
    return () => window.removeEventListener(OPEN_LIBRARY_BROWSER_EVENT, openBrowser);
  }, []);

  const filtered = aliases.filter(({ alias, name }) => `${alias} ${name}`.toLowerCase().includes(query.toLowerCase()));
  const insert = (alias: string) => {
    const includePath = EXAMPLE_PATHS[alias] ?? `${alias}/`;
    const line = `include <${includePath}>`;
    if (!code.includes(line)) onCodeChange(`${line}\n\n${code}`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="flex items-center gap-2"><BookOpen className="size-4" />Bundled libraries</DialogTitle>
          <DialogDescription>Libraries download on demand when the source references them.</DialogDescription>
        </DialogHeader>
        <div className="border-b p-3">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
            <Input className="pl-8" onChange={(event) => setQuery(event.target.value)} placeholder="Filter aliases…" value={query} />
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.map(({ alias, name }) => {
            const path = EXAMPLE_PATHS[alias] ?? `${alias}/`;
            return (
              <div className="hover:bg-accent/50 flex items-center justify-between rounded-md px-3 py-2" key={`${alias}-${name}`}>
                <div className="min-w-0">
                  <div className="text-sm font-medium">{alias}</div>
                  <div className="text-muted-foreground truncate font-mono text-[11px]">include &lt;{path}&gt;</div>
                </div>
                <Button aria-label={`Insert ${alias} include`} onClick={() => insert(alias)} size="icon" variant="ghost">
                  <Copy className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
