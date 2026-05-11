"use client";

import * as React from "react";
import { Streamdown } from "streamdown";

import { cn } from "@/lib/utils";

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

export { Message, MessageContent, MessageResponse };
