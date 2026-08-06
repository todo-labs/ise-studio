"use client";

import * as React from "react";
import { ArrowDownIcon, MessageSquareIcon } from "lucide-react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";

import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";

function Conversation({
  className,
  children,
  ...props
}: React.ComponentProps<typeof StickToBottom>) {
  return (
    <StickToBottom
      className={cn("relative flex min-h-0 flex-1 flex-col overflow-hidden", className)}
      initial="smooth"
      resize="smooth"
      {...props}
    >
      {children}
    </StickToBottom>
  );
}

function ConversationContent({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <StickToBottom.Content
      className={cn("flex min-h-full flex-col gap-4 p-4", className)}
      scrollClassName="min-h-0 flex-1 overflow-y-auto"
      {...props}
    >
      {children}
    </StickToBottom.Content>
  );
}

function ConversationEmptyState({
  icon = <MessageSquareIcon className="size-10" />,
  title = "Start a conversation",
  description,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
}) {
  return (
    <div
      className={cn(
        "text-muted-foreground flex h-full min-h-64 flex-col items-center justify-center gap-2 text-center",
        className,
      )}
      {...props}
    >
      {icon}
      <p className="text-foreground text-sm font-medium">{title}</p>
      {description ? <p className="max-w-64 text-xs">{description}</p> : null}
    </div>
  );
}

function ConversationScrollButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) return null;

  return (
    <Button
      className={cn("absolute right-4 bottom-4 size-8 rounded-full shadow-md", className)}
      onClick={() => scrollToBottom()}
      size="icon"
      type="button"
      variant="secondary"
      {...props}
    >
      <ArrowDownIcon className="size-4" />
    </Button>
  );
}

export { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton };
