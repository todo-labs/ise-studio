"use client";

import * as React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

function ModelSelector({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      {children}
    </Select>
  );
}

function ModelSelectorTrigger(props: React.ComponentProps<typeof SelectTrigger>) {
  return <SelectTrigger size="sm" {...props} />;
}

function ModelSelectorValue(props: React.ComponentProps<typeof SelectValue>) {
  return <SelectValue {...props} />;
}

function ModelSelectorContent(props: React.ComponentProps<typeof SelectContent>) {
  return <SelectContent {...props} />;
}

function ModelSelectorItem(props: React.ComponentProps<typeof SelectItem>) {
  return <SelectItem {...props} />;
}

export {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorItem,
  ModelSelectorTrigger,
  ModelSelectorValue,
};
