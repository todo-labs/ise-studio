import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, CheckIcon, CopyIcon, GlobeIcon, Trash2Icon } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import {
  DirectChatTransport,
  type InferUITools,
  isReasoningUIPart,
  isTextUIPart,
  isToolUIPart,
  type ChatStatus,
  type LanguageModelUsage,
  type UIMessage,
} from "ai";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useStickToBottomContext } from "use-stick-to-bottom";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@ise-studio/ui/ai-elements/conversation";
import {
  Context,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextCacheUsage,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextTrigger,
} from "@ise-studio/ui/ai-elements/context";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@ise-studio/ui/ai-elements/message";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorItem,
  ModelSelectorTrigger,
  ModelSelectorValue,
} from "@ise-studio/ui/ai-elements/model-selector";
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@ise-studio/ui/ai-elements/prompt-input";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@ise-studio/ui/ai-elements/tool";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@ise-studio/ui/ai-elements/reasoning";
import {
  createOpenRouterChatAgent,
  createOpenRouterAssistantTools,
  accumulateConversationUsage,
  calculateCost,
  getModelPricing,
  type EditorSelection,
  type ModelPricing,
} from "@ise-studio/ai";
import {
  AI_SETTINGS_EVENT,
  loadAISettings,
  OPENROUTER_MODELS,
  OPENROUTER_PROVIDER,
  saveSelectedModel,
  type AISettings,
} from "@ise-studio/ai";
import { cn } from "@ise-studio/ui/utils";
import { Button } from "@ise-studio/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ise-studio/ui/alert-dialog";
import {
  clearConversationMessages,
  loadConversationMessages,
  persistConversationMessages,
} from "../conversation-storage";

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  currentSelection?: EditorSelection | null;
  onCodeChange: (code: string) => void;
}

const MAX_CONVERSATION_MESSAGES = 50;
type AssistantUIMessage = UIMessage<
  { usage?: LanguageModelUsage },
  never,
  InferUITools<ReturnType<typeof createOpenRouterAssistantTools>>
>;

export function AIChat({
  isOpen,
  onClose: _onClose,
  code,
  currentSelection,
  onCodeChange,
}: AIChatProps) {
  const [input, setInput] = useState("");
  const [settings, setSettings] = useState<AISettings>(() =>
    typeof window === "undefined"
      ? { apiKey: "", model: OPENROUTER_PROVIDER.defaultModel }
      : loadAISettings(),
  );
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [pricing, setPricing] = useState<ModelPricing | null>(null);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [initialMessages] = useState<AssistantUIMessage[]>(
    loadConversationMessages<AssistantUIMessage>,
  );

  const codeRef = useRef(code);
  const selectionRef = useRef<EditorSelection | null>(currentSelection ?? null);

  useEffect(() => {
    const refreshSettings = () => setSettings(loadAISettings());
    window.addEventListener(AI_SETTINGS_EVENT, refreshSettings);
    return () => window.removeEventListener(AI_SETTINGS_EVENT, refreshSettings);
  }, []);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    selectionRef.current = currentSelection ?? null;
  }, [currentSelection]);

  useEffect(() => {
    let active = true;
    setPricing(null);
    if (settings.model) {
      getModelPricing(settings.model).then((res) => {
        if (active) setPricing(res);
      });
    }
    return () => {
      active = false;
    };
  }, [settings.model]);

  const agent = useMemo(() => {
    if (!settings.apiKey.trim()) return null;

    return createOpenRouterChatAgent({
      apiKey: settings.apiKey,
      model: settings.model,
      useWebSearch,
      getCurrentCode: () => codeRef.current,
      getCurrentSelection: () => selectionRef.current,
      onCodeChange,
    });
  }, [onCodeChange, settings.apiKey, settings.model, useWebSearch]);

  const transport = useMemo(() => {
    if (!agent) return null;
    return new DirectChatTransport({
      agent,
      messageMetadata: ({ part }) =>
        part.type === "finish" ? { usage: part.totalUsage } : undefined,
    });
  }, [agent]);

  const { messages, setMessages, sendMessage, stop, status, error } = useChat({
    messages: initialMessages,
    onFinish: ({ messages: completedMessages }) => {
      persistConversationMessages(completedMessages);
    },
    transport: transport ?? undefined,
  });

  useEffect(() => {
    if (status === "ready" && messages.length > 0) persistConversationMessages(messages);
  }, [messages, status]);

  const handleClearConversation = () => {
    stop();
    clearConversationMessages();
    setMessages([]);
    setIsClearDialogOpen(false);
  };

  useEffect(() => {
    if (status !== "ready" || messages.length <= MAX_CONVERSATION_MESSAGES) return;
    setMessages((current) => current.slice(-MAX_CONVERSATION_MESSAGES));
  }, [messages.length, setMessages, status]);

  const { inputTokens, outputTokens, reasoningTokens, cachedInputTokens } = useMemo(() => {
    return accumulateConversationUsage(messages);
  }, [messages]);

  const totalTokens = inputTokens + outputTokens;
  const hasUsageMetadata = messages.length > 0 && totalTokens > 0;
  const estimatedCost =
    pricing && hasUsageMetadata ? calculateCost(pricing, inputTokens, outputTokens) : undefined;

  const hasApiKey = Boolean(settings.apiKey.trim());

  const handleModelChange = (model: string) => {
    setSettings((previous) => ({ ...previous, model }));
    saveSelectedModel(model);
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text.trim();
    if (!text || status === "submitted" || status === "streaming") return;

    setInput("");
    await sendMessage({ text });
  };

  if (!isOpen) return null;

  return (
    <div className="bg-muted/30 flex h-full flex-col border-r">
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <span className="text-sm font-medium">AI Assistant</span>
        </div>
        <Button
          aria-label="Clear chat"
          disabled={messages.length === 0}
          onClick={() => setIsClearDialogOpen(true)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>

      <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the assistant chat history from this browser. Your code and
              CAD model will not be changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearConversation} variant="destructive">
              Clear chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {pricing?.contextWindow ? (
        <Context
          maxTokens={pricing.contextWindow}
          modelId={settings.model}
          usedTokens={totalTokens}
          usage={{
            inputTokens,
            inputTokenDetails: {
              noCacheTokens: Math.max(0, inputTokens - cachedInputTokens),
              cacheReadTokens: cachedInputTokens,
              cacheWriteTokens: undefined,
            },
            outputTokens,
            outputTokenDetails: {
              textTokens: Math.max(0, outputTokens - reasoningTokens),
              reasoningTokens,
            },
            totalTokens,
            reasoningTokens,
            cachedInputTokens,
          }}
        >
          <ContextTrigger
            aria-label="Show conversation context usage"
            className="w-full justify-between rounded-none border-b px-4 py-2"
          />
          <ContextContent align="start">
            <ContextContentHeader />
            <ContextContentBody>
              <div className="mb-2 truncate text-xs font-medium" title={settings.model}>
                {settings.model}
              </div>
              <div className="space-y-1">
                <ContextInputUsage />
                <ContextOutputUsage />
                <ContextReasoningUsage />
                <ContextCacheUsage />
                {!hasUsageMetadata ? (
                  <p className="text-xs text-muted-foreground">Token usage unavailable</p>
                ) : null}
              </div>
            </ContextContentBody>
            <ContextContentFooter>
              <span className="text-muted-foreground">Estimated cost</span>
              <span>{estimatedCost == null ? "Unavailable" : `$${estimatedCost.toFixed(4)}`}</span>
            </ContextContentFooter>
          </ContextContent>
        </Context>
      ) : (
        <div
          className="flex items-center gap-3 border-b px-4 py-2 text-xs text-muted-foreground"
          aria-label="Conversation context usage unavailable"
        >
          <span className="max-w-40 truncate font-medium">{settings.model}</span>
          <span>Context usage unavailable</span>
        </div>
      )}

      <Conversation>
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Start a conversation"
              description="Ask about OpenSCAD code, rendering, or the current scene."
            />
          ) : null}
          {messages.length > 0 ? (
            <VirtualizedConversationMessages messages={messages} status={status} error={error} />
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t p-3">
        <div className="text-muted-foreground mb-2 truncate text-xs">
          {hasApiKey
            ? `${OPENROUTER_PROVIDER.name} · ${settings.model}`
            : "Add your OpenRouter API key in Settings"}
        </div>

        <PromptInput onSubmit={handleSubmit} onValueChange={setInput} status={status} value={input}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="Ask about OpenSCAD..." />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputButton
                aria-pressed={useWebSearch}
                className={cn(useWebSearch && "bg-accent text-accent-foreground")}
                onClick={() => setUseWebSearch((value) => !value)}
                title="Toggle OpenRouter web search"
              >
                <GlobeIcon className="size-4" />
                Search
              </PromptInputButton>
              <ModelSelector value={settings.model} onValueChange={handleModelChange}>
                <ModelSelectorTrigger className="max-w-44">
                  <ModelSelectorValue />
                </ModelSelectorTrigger>
                <ModelSelectorContent>
                  {OPENROUTER_MODELS.map((model) => (
                    <ModelSelectorItem key={model.id} value={model.id}>
                      {model.name}
                    </ModelSelectorItem>
                  ))}
                </ModelSelectorContent>
              </ModelSelector>
            </PromptInputTools>
            <PromptInputSubmit disabled={!hasApiKey || !input.trim()} status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

function VirtualizedConversationMessages({
  messages,
  status,
  error,
}: {
  messages: UIMessage[];
  status: ChatStatus;
  error?: Error;
}) {
  const { scrollRef } = useStickToBottomContext();
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const isThinking = status === "submitted" || status === "streaming";
  const itemCount = messages.length + (isThinking ? 1 : 0) + (error ? 1 : 0);
  const virtualizer = useVirtualizer({
    count: itemCount,
    getScrollElement: () => scrollElement,
    estimateSize: () => 96,
    overscan: 4,
  });

  useEffect(() => {
    let frame = 0;

    const resolveScrollElement = () => {
      if (scrollRef.current) {
        setScrollElement(scrollRef.current);
        return;
      }
      frame = requestAnimationFrame(resolveScrollElement);
    };

    frame = requestAnimationFrame(resolveScrollElement);
    return () => cancelAnimationFrame(frame);
  }, [scrollRef]);

  return (
    <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((item) => {
        const isThinkingItem = item.index === messages.length && isThinking;
        const isErrorItem = item.index === messages.length + (isThinking ? 1 : 0) && error;

        return (
          <div
            className="absolute top-0 left-0 w-full pb-4"
            data-index={item.index}
            key={item.key}
            ref={virtualizer.measureElement}
            style={{ transform: `translateY(${item.start}px)` }}
          >
            {item.index < messages.length ? (
              <ConversationMessage
                isLastMessage={item.index === messages.length - 1}
                isStreaming={isThinking}
                message={messages[item.index]!}
              />
            ) : null}
            {isThinkingItem ? (
              <div className="max-w-[85%] px-1 text-sm text-muted-foreground">Thinking...</div>
            ) : null}
            {isErrorItem ? (
              <div className="space-y-2">
                <Message from="assistant">
                  <MessageContent>
                    <MessageResponse>{getFallbackResponse(error)}</MessageResponse>
                  </MessageContent>
                </Message>
                <div className="bg-destructive/10 text-destructive max-w-[95%] rounded-md px-3 py-2 text-sm">
                  {formatChatError(error)}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ConversationMessage({
  isLastMessage,
  isStreaming,
  message,
}: {
  isLastMessage: boolean;
  isStreaming: boolean;
  message: UIMessage;
}) {
  return (
    <div className="space-y-3">
      {message.role === "user" ? (
        <Message from="user">
          <MessageContent className="bg-primary text-primary-foreground">
            {message.parts.map((part, index) =>
              isTextUIPart(part) ? (
                <MessageResponse key={`${message.id}-${index}`}>{part.text}</MessageResponse>
              ) : null,
            )}
          </MessageContent>
        </Message>
      ) : (
        <div className="group space-y-3 px-1 text-sm leading-6">
          {(() => {
            const reasoningParts = message.parts.filter(isReasoningUIPart);
            if (reasoningParts.length === 0) return null;
            const reasoningText = reasoningParts.map((part) => part.text).join("\n\n");
            const lastPart = message.parts.at(-1);
            const isReasoningStreaming =
              isLastMessage && isStreaming && lastPart?.type === "reasoning";
            return (
              <Reasoning isStreaming={isReasoningStreaming}>
                <ReasoningTrigger />
                <ReasoningContent>{reasoningText}</ReasoningContent>
              </Reasoning>
            );
          })()}
          {message.parts.map((part, index) => {
            if (isTextUIPart(part)) {
              return (
                <div key={`${message.id}-${index}`} className="space-y-2">
                  <MessageResponse>{part.text}</MessageResponse>
                  {index === message.parts.length - 1 ? (
                    <MessageActions>
                      <CopyButton text={part.text} />
                    </MessageActions>
                  ) : null}
                </div>
              );
            }

            if (part.type === "dynamic-tool" || isToolUIPart(part)) {
              return (
                <Tool key={`${message.id}-${index}`} defaultOpen={part.state === "output-error"}>
                  {part.type === "dynamic-tool" ? (
                    <ToolHeader type={part.type} toolName={part.toolName} state={part.state} />
                  ) : (
                    <ToolHeader type={part.type} state={part.state} />
                  )}
                  <ToolContent>
                    <ToolInput input={part.input} />
                    <ToolOutput output={part.output} errorText={part.errorText} />
                  </ToolContent>
                </Tool>
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
}

function formatChatError(error: Error) {
  const message = error.message || "The assistant request failed.";
  const normalized = message.toLowerCase();
  if (
    normalized.includes("401") ||
    normalized.includes("unauthorized") ||
    normalized.includes("invalid api")
  ) {
    return "OpenRouter rejected the API key. Check it in Settings and try again.";
  }
  if (normalized.includes("429") || normalized.includes("rate limit")) {
    return "OpenRouter rate-limited this request. Wait a moment and try again.";
  }
  if (
    normalized.includes("404") ||
    normalized.includes("model not found") ||
    normalized.includes("not available")
  ) {
    return "The selected model is unavailable. Choose another model in the selector and try again.";
  }
  if (normalized.includes("timeout") || normalized.includes("timed out")) {
    return "The assistant timed out. Try a shorter request or try again.";
  }
  if (normalized.includes("network") || normalized.includes("failed to fetch")) {
    return "The assistant could not reach OpenRouter. Check your connection and try again.";
  }
  return message;
}

function getFallbackResponse(error: Error) {
  const message = formatChatError(error).toLowerCase();
  if (message.includes("selected model is unavailable")) {
    return "I can’t reach the selected model right now. Choose another model from the selector and try again.";
  }
  if (message.includes("api key")) {
    return "I’m ready to help, but the OpenRouter API key needs attention. Check it in Settings and try again.";
  }
  return "I couldn’t complete that request right now. Your code is safe—please try again or choose another model.";
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <MessageAction onClick={handleCopy} title="Copy message">
      {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
    </MessageAction>
  );
}
