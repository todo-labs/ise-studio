"use client";

import * as React from "react";
import { SendIcon } from "lucide-react";

import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";

export type PromptInputMessage = {
  text: string;
  files?: File[];
};

type PromptInputContextValue = {
  text: string;
  setText: (value: string) => void;
  status: PromptInputStatus;
};

type PromptInputStatus = "ready" | "submitted" | "streaming" | "error";

const PromptInputContext = React.createContext<PromptInputContextValue | null>(null);

function usePromptInput() {
  const context = React.useContext(PromptInputContext);

  if (!context) {
    throw new Error("PromptInput components must be used within PromptInput.");
  }

  return context;
}

function PromptInput({
  className,
  children,
  onSubmit,
  value,
  onValueChange,
  status = "ready",
  ...props
}: Omit<React.ComponentProps<"form">, "onSubmit"> & {
  onSubmit?: (message: PromptInputMessage) => void;
  value: string;
  onValueChange: (value: string) => void;
  status?: PromptInputStatus;
}) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.({ text: value });
  };

  return (
    <PromptInputContext.Provider value={{ text: value, setText: onValueChange, status }}>
      <form
        className={cn("rounded-lg border bg-background", className)}
        onSubmit={handleSubmit}
        {...props}
      >
        {children}
      </form>
    </PromptInputContext.Provider>
  );
}

function PromptInputBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-2", className)} {...props} />;
}

function PromptInputTextarea({
  className,
  placeholder = "Type a message...",
  ...props
}: Omit<React.ComponentProps<"textarea">, "value" | "onChange">) {
  const { text, setText } = usePromptInput();

  return (
    <textarea
      className={cn(
        "placeholder:text-muted-foreground max-h-40 min-h-16 w-full resize-none bg-transparent px-2 py-1 text-sm outline-none",
        className,
      )}
      onChange={(event) => setText(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          event.currentTarget.form?.requestSubmit();
        }
      }}
      placeholder={placeholder}
      value={text}
      {...props}
    />
  );
}

function PromptInputFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center justify-between gap-2 border-t px-2 py-2", className)}
      {...props}
    />
  );
}

function PromptInputTools({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex min-w-0 items-center gap-2", className)} {...props} />;
}

function PromptInputButton({
  className,
  variant = "ghost",
  size = "sm",
  ...props
}: React.ComponentProps<typeof Button>) {
  return <Button className={className} size={size} type="button" variant={variant} {...props} />;
}

function PromptInputSubmit({
  className,
  disabled,
  status,
  ...props
}: React.ComponentProps<typeof Button> & {
  status?: PromptInputStatus;
}) {
  const context = usePromptInput();
  const currentStatus = status ?? context.status;
  const busy = currentStatus === "submitted" || currentStatus === "streaming";

  return (
    <Button className={className} disabled={disabled || busy} size="icon" type="submit" {...props}>
      <SendIcon className={cn("size-4", busy && "animate-pulse")} />
    </Button>
  );
}

export {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
};
