import { useMemo } from "react";

import {
  parseCustomizerControls,
  updateCustomizerValue,
  type CustomizerControl,
  type CustomizerValue,
} from "@ise-studio/openscad";
import { Input } from "@ise-studio/ui/input";
import { Label } from "@ise-studio/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ise-studio/ui/select";
import { Slider } from "@ise-studio/ui/slider";
import { Toggle } from "@ise-studio/ui/toggle";

interface CustomizerPanelProps {
  code: string;
  onCodeChange: (code: string) => void;
}

export function CustomizerPanel({ code, onCodeChange }: CustomizerPanelProps) {
  const controls = useMemo(() => parseCustomizerControls(code), [code]);
  if (controls.length === 0) return null;

  const update = (control: CustomizerControl, value: CustomizerValue) => {
    onCodeChange(updateCustomizerValue(code, control, value));
  };

  return (
    <details className="border-b" open>
      <summary className="hover:bg-accent/40 flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-medium">
        <span>Customizer</span>
        <span className="text-muted-foreground font-mono">{controls.length} params</span>
      </summary>
      <div className="grid gap-3 px-3 pb-3">
        {controls.map((control) => (
          <CustomizerControlField control={control} key={control.name} onChange={(value) => update(control, value)} />
        ))}
      </div>
    </details>
  );
}

function CustomizerControlField({
  control,
  onChange,
}: {
  control: CustomizerControl;
  onChange: (value: CustomizerValue) => void;
}) {
  if (control.type === "select") {
    return (
      <div className="grid gap-1.5">
        <Label className="text-xs">{control.label}</Label>
        <Select value={String(control.value)} onValueChange={onChange}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {control.options?.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (control.type === "boolean") {
    return (
      <Toggle
        className="h-8 w-full justify-between px-2 text-xs"
        onPressedChange={onChange}
        pressed={Boolean(control.value)}
        variant="outline"
      >
        {control.label}
        <span className="text-muted-foreground font-mono">{String(control.value)}</span>
      </Toggle>
    );
  }

  const value = Number(control.value);
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{control.label}</Label>
        <Input
          aria-label={`${control.label} value`}
          className="h-7 w-20 text-right font-mono text-xs"
          max={control.max}
          min={control.min}
          onChange={(event) => onChange(Number(event.target.value))}
          step={control.step}
          type="number"
          value={value}
        />
      </div>
      <Slider
        aria-label={control.label}
        max={control.max}
        min={control.min}
        onValueChange={([next]) => next != null && onChange(next)}
        step={control.step}
        value={[value]}
      />
      <div className="text-muted-foreground flex justify-between font-mono text-[10px]">
        <span>{control.min}</span><span>{control.max}</span>
      </div>
    </div>
  );
}
