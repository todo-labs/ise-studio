import { useEffect, useState } from "react";
import { Box, Circle, Cylinder, Plus, WandSparkles, X } from "lucide-react";

import {
  createVisualBlock,
  generateOpenSCADFromBlocks,
  type VisualBlock,
  type VisualBlockKind,
} from "@ise-studio/openscad";
import { Button } from "@ise-studio/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@ise-studio/ui/dialog";
import { Input } from "@ise-studio/ui/input";
import { OPEN_VISUAL_BLOCKS_EVENT } from "@ise-studio/ui/studio-events";

interface VisualBlocksPanelProps {
  onCodeChange: (code: string) => void;
}

const BLOCK_OPTIONS: Array<{ kind: VisualBlockKind; label: string; icon: typeof Box }> = [
  { kind: "cube", label: "Cube", icon: Box },
  { kind: "sphere", label: "Sphere", icon: Circle },
  { kind: "cylinder", label: "Cylinder", icon: Cylinder },
];

export function VisualBlocksPanel({ onCodeChange }: VisualBlocksPanelProps) {
  const [open, setOpen] = useState(false);
  const [blocks, setBlocks] = useState<VisualBlock[]>([]);

  useEffect(() => {
    const openPanel = () => setOpen(true);
    window.addEventListener(OPEN_VISUAL_BLOCKS_EVENT, openPanel);
    return () => window.removeEventListener(OPEN_VISUAL_BLOCKS_EVENT, openPanel);
  }, []);

  const addBlock = (kind: VisualBlockKind) => {
    setBlocks((current) => [...current, createVisualBlock(kind, `${kind}-${current.length + 1}`)]);
  };

  const updateBlock = (id: string, update: (block: VisualBlock) => VisualBlock) => {
    setBlocks((current) => current.map((block) => (block.id === id ? update(block) : block)));
  };

  const apply = () => {
    onCodeChange(generateOpenSCADFromBlocks(blocks));
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="flex items-center gap-2">
            <WandSparkles className="size-4" />
            Visual blocks
          </DialogTitle>
          <DialogDescription>
            Assemble primitives visually, then generate editable OpenSCAD code.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b p-3">
          <div className="flex flex-wrap gap-2">
            {BLOCK_OPTIONS.map(({ kind, label, icon: Icon }) => (
              <Button key={kind} onClick={() => addBlock(kind)} size="sm" variant="outline">
                <Icon className="size-4" />
                <Plus className="size-3" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {blocks.length === 0 ? (
            <p className="text-muted-foreground rounded-md border border-dashed p-8 text-center text-sm">
              Add a primitive to start building a model.
            </p>
          ) : (
            blocks.map((block, index) => (
              <BlockEditor
                key={block.id}
                block={block}
                index={index}
                onChange={(update) => updateBlock(block.id, update)}
                onRemove={() =>
                  setBlocks((current) => current.filter((item) => item.id !== block.id))
                }
              />
            ))
          )}
        </div>

        <div className="bg-muted/30 flex items-center justify-between border-t px-4 py-3">
          <span className="text-muted-foreground text-xs">
            {blocks.length} block{blocks.length === 1 ? "" : "s"} · output stays editable
          </span>
          <Button onClick={apply}>
            <WandSparkles className="size-4" />
            Generate code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BlockEditor({
  block,
  index,
  onChange,
  onRemove,
}: {
  block: VisualBlock;
  index: number;
  onChange: (update: (block: VisualBlock) => VisualBlock) => void;
  onRemove: () => void;
}) {
  const setNumber =
    (setter: (value: number) => void) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);
      setter(Number.isFinite(value) ? value : 0);
    };

  return (
    <div className="rounded-md border p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium">
          {index + 1}. {block.kind}
        </span>
        <Button
          aria-label={`Remove ${block.kind} ${index + 1}`}
          onClick={onRemove}
          size="icon"
          variant="ghost"
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {block.kind === "cube" ? (
          ["X", "Y", "Z"].map((axis, axisIndex) => (
            <NumberField
              key={axis}
              label={`Size ${axis}`}
              value={block.size[axisIndex]!}
              onChange={setNumber((value) =>
                onChange((current) => ({
                  ...current,
                  size: replaceAt(current.size, axisIndex, value),
                })),
              )}
            />
          ))
        ) : (
          <NumberField
            label="Radius"
            value={block.radius}
            onChange={setNumber((value) => onChange((current) => ({ ...current, radius: value })))}
          />
        )}
        {block.kind === "cylinder" && (
          <NumberField
            label="Height"
            value={block.height}
            onChange={setNumber((value) => onChange((current) => ({ ...current, height: value })))}
          />
        )}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {["X", "Y", "Z"].map((axis, axisIndex) => (
          <NumberField
            key={`translate-${axis}`}
            label={`Move ${axis}`}
            value={block.transform.translate[axisIndex]!}
            onChange={setNumber((value) =>
              onChange((current) => ({
                ...current,
                transform: {
                  ...current.transform,
                  translate: replaceAt(current.transform.translate, axisIndex, value),
                },
              })),
            )}
          />
        ))}
      </div>
      <label className="mt-3 flex items-center gap-2 text-xs">
        <input
          checked={block.center}
          onChange={(event) =>
            onChange((current) => ({ ...current, center: event.target.checked }))
          }
          type="checkbox"
        />
        Center primitive on its origin
      </label>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="text-muted-foreground flex flex-col gap-1 text-xs">
      {label}
      <Input min="0" onChange={onChange} step="0.1" type="number" value={value} />
    </label>
  );
}

function replaceAt<T>(values: readonly T[], index: number, value: T) {
  return values.map((current, currentIndex) => (currentIndex === index ? value : current)) as [
    T,
    T,
    T,
  ];
}
