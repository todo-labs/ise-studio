"use client";

import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import { Collapsible } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import type { DynamicToolUIPart, ToolUIPart } from "ai";

import { Badge } from "../../components/ui/badge";
import { cn } from "../../lib/utils";

// AI Elements' Tool component, kept in the local registry so it follows our shadcn theme.
export type ToolPart = ToolUIPart | DynamicToolUIPart;
export type ToolProps = ComponentProps<typeof Collapsible.Root>;

export function Tool({ className, ...props }: ToolProps) {
  return (
    <Collapsible.Root
      className={cn("group not-prose mb-4 w-full rounded-md border", className)}
      {...props}
    />
  );
}

export type ToolHeaderProps = Omit<ComponentProps<typeof Collapsible.Trigger>, "type"> & {
  title?: string;
  className?: string;
  type: ToolPart["type"];
  state: ToolPart["state"];
  toolName?: string;
};

const statusLabels: Record<ToolPart["state"], string> = {
  "approval-requested": "Awaiting Approval",
  "approval-responded": "Responded",
  "input-available": "Running",
  "input-streaming": "Pending",
  "output-available": "Completed",
  "output-denied": "Denied",
  "output-error": "Error",
};

const statusIcons: Record<ToolPart["state"], ReactNode> = {
  "approval-requested": <ClockIcon className="size-4 text-yellow-600" />,
  "approval-responded": <CheckCircleIcon className="size-4 text-blue-600" />,
  "input-available": <ClockIcon className="size-4 animate-pulse" />,
  "input-streaming": <CircleIcon className="size-4" />,
  "output-available": <CheckCircleIcon className="size-4 text-green-600" />,
  "output-denied": <XCircleIcon className="size-4 text-orange-600" />,
  "output-error": <XCircleIcon className="size-4 text-red-600" />,
};

export function getStatusBadge(status: ToolPart["state"]) {
  return (
    <Badge className="gap-1.5 rounded-full text-xs" variant="secondary">
      {statusIcons[status]}
      {statusLabels[status]}
    </Badge>
  );
}

export function ToolHeader({ className, title, type, state, toolName, ...props }: ToolHeaderProps) {
  const derivedName = type === "dynamic-tool" ? toolName : type.split("-").slice(1).join("-");
  return (
    <Collapsible.Trigger
      className={cn("flex w-full items-center justify-between gap-4 p-3", className)}
      {...props}
    >
      <div className="flex items-center gap-2">
        <WrenchIcon className="text-muted-foreground size-4" />
        <span className="text-sm font-medium">{title ?? derivedName}</span>
        {getStatusBadge(state)}
      </div>
      <ChevronDownIcon className="text-muted-foreground size-4 transition-transform group-data-[state=open]:rotate-180" />
    </Collapsible.Trigger>
  );
}

export function ToolContent({ className, ...props }: ComponentProps<typeof Collapsible.Content>) {
  return (
    <Collapsible.Content
      className={cn("space-y-4 p-4 text-sm outline-none", className)}
      {...props}
    />
  );
}

export function ToolInput({
  input,
  className,
  ...props
}: ComponentProps<"div"> & { input?: ToolPart["input"] }) {
  if (input === undefined) return null;
  return (
    <ToolSection className={className} label="Parameters" {...props}>
      <JsonValue value={input} />
    </ToolSection>
  );
}

export function ToolOutput({
  output,
  errorText,
  className,
  ...props
}: ComponentProps<"div"> & { output?: ToolPart["output"]; errorText?: ToolPart["errorText"] }) {
  if (output === undefined && !errorText) return null;
  return (
    <ToolSection
      className={cn(errorText && "text-destructive", className)}
      label={errorText ? "Error" : "Result"}
      {...props}
    >
      {errorText ? <div>{errorText}</div> : <JsonValue value={output} />}
    </ToolSection>
  );
}

function ToolSection({
  label,
  children,
  className,
  ...props
}: ComponentProps<"div"> & { label: string }) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      <h4 className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</h4>
      <div className="bg-muted/50 overflow-x-auto rounded-md p-2 text-xs">{children}</div>
    </div>
  );
}

function JsonValue({ value }: { value: unknown }) {
  return (
    <pre className="whitespace-pre-wrap break-words">
      {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
    </pre>
  );
}
