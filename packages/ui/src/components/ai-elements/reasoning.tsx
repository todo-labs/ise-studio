"use client";

import { BrainIcon, ChevronDownIcon } from "lucide-react";
import { Collapsible } from "radix-ui";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";

import { cn } from "../../lib/utils";

interface ReasoningContextValue {
  isStreaming: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  duration?: number;
}

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

function useReasoning() {
  const context = useContext(ReasoningContext);
  if (!context) throw new Error("Reasoning components must be used within Reasoning");
  return context;
}

export type ReasoningProps = ComponentProps<typeof Collapsible.Root> & {
  isStreaming?: boolean;
  duration?: number;
};

export function Reasoning({
  children,
  defaultOpen,
  isStreaming = false,
  open,
  onOpenChange,
  duration,
  ...props
}: ReasoningProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen ?? isStreaming);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = (nextOpen: boolean) => {
    if (!isControlled) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  useEffect(() => {
    if (isStreaming) {
      setIsOpen(true);
    } else if (!isControlled) {
      setInternalOpen(false);
    }
  }, [isControlled, isStreaming]);

  const contextValue = useMemo(
    () => ({ isOpen, isStreaming, setIsOpen, duration }),
    [duration, isOpen, isStreaming],
  );

  return (
    <ReasoningContext.Provider value={contextValue}>
      <Collapsible.Root open={isOpen} onOpenChange={setIsOpen} {...props}>
        {children}
      </Collapsible.Root>
    </ReasoningContext.Provider>
  );
}

export type ReasoningTriggerProps = ComponentProps<typeof Collapsible.Trigger> & {
  getThinkingMessage?: (isStreaming: boolean, duration?: number) => ReactNode;
};

export function ReasoningTrigger({
  children,
  className,
  getThinkingMessage = (isStreaming, duration) =>
    isStreaming ? "Thinking…" : duration ? `Thought for ${duration}s` : "Thought process",
  ...props
}: ReasoningTriggerProps) {
  const { duration, isStreaming } = useReasoning();
  return (
    <Collapsible.Trigger
      className={cn("text-muted-foreground flex items-center gap-2 text-xs font-medium", className)}
      {...props}
    >
      <BrainIcon className={cn("size-3.5", isStreaming && "animate-pulse")} />
      <span>{children ?? getThinkingMessage(isStreaming, duration)}</span>
      <ChevronDownIcon className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
    </Collapsible.Trigger>
  );
}

export type ReasoningContentProps = ComponentProps<typeof Collapsible.Content>;

export function ReasoningContent({ className, ...props }: ReasoningContentProps) {
  return (
    <Collapsible.Content
      className={cn("text-muted-foreground mt-2 border-l-2 pl-3 text-xs leading-5", className)}
      {...props}
    />
  );
}

export { useReasoning };
