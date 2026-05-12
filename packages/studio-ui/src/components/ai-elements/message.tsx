"use client";

import * as React from "react";
import { Streamdown } from "streamdown";

import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";

type MessageRole = "user" | "assistant" | "system" | "data";

function Message({
  from = "assistant",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  from?: MessageRole;
}) {
  return (
    <div
      data-role={from}
      className={cn("flex w-full", from === "user" ? "justify-end" : "justify-start", className)}
      {...props}
    />
  );
}

function MessageContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "bg-muted text-foreground max-w-[85%] rounded-lg px-3 py-2 text-sm",
        "data-[role=user]:bg-primary data-[role=user]:text-primary-foreground",
        className,
      )}
      {...props}
    />
  );
}

function MessageResponse({ children, className }: { children: string; className?: string }) {
  return (
    <Streamdown className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      {children}
    </Streamdown>
  );
}

function MessageActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

function MessageAction({
  className,
  variant = "ghost",
  size = "icon",
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn("size-7 text-muted-foreground hover:text-foreground", className)}
      size={size}
      variant={variant}
      {...props}
    />
  );
}

export { Message, MessageContent, MessageResponse, MessageActions, MessageAction };
