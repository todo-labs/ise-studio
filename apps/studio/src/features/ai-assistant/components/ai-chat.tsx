import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, CheckIcon, CopyIcon, GlobeIcon } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DirectChatTransport, getToolName, isTextUIPart, isToolUIPart } from "ai";

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
  createOpenRouterChatAgent,
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

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  currentSelection?: EditorSelection | null;
  onCodeChange: (code: string) => void;
}

const MAX_CONVERSATION_MESSAGES = 50;

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
    return new DirectChatTransport({ agent });
  }, [agent]);

  const { messages, setMessages, sendMessage, status, error } = useChat({
    transport: transport ?? undefined,
  });

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
      </div>

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
          {messages.map((message) => (
            <div key={message.id} className="space-y-3">
              {message.role === "user" ? (
                <Message from="user">
                  <MessageContent className="bg-primary text-primary-foreground">
                    {message.parts.map((part, index) =>
                      isTextUIPart(part) ? (
                        <MessageResponse key={`${message.id}-${index}`}>
                          {part.text}
                        </MessageResponse>
                      ) : null,
                    )}
                  </MessageContent>
                </Message>
              ) : (
                <div className="group space-y-3 px-1 text-sm leading-6">
                  {message.parts.map((part, index) => {
                    if (isTextUIPart(part)) {
                      return (
                        <div key={`${message.id}-${index}`} className="space-y-2">
                          <MessageResponse>{part.text}</MessageResponse>
                          {index === message.parts.length - 1 && (
                            <MessageActions>
                              <CopyButton text={part.text} />
                            </MessageActions>
                          )}
                        </div>
                      );
                    }

                    if (part.type === "dynamic-tool" || isToolUIPart(part)) {
                      const toolName = getToolName(part);

                      return (
                        <div
                          key={`${message.id}-${index}`}
                          className="my-1.5 flex w-fit items-center gap-2 rounded-md border border-border/50 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground shadow-sm"
                        >
                          <Bot className="size-3.5 opacity-70" />
                          <span className="font-mono">{toolName}</span>
                          {part.state === "input-streaming" ? (
                            <span className="animate-pulse">...</span>
                          ) : part.state === "output-error" ? (
                            <span className="text-destructive font-medium">Failed</span>
                          ) : (
                            <span className="text-emerald-500 font-medium">✓</span>
                          )}
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              )}
            </div>
          ))}
          {status === "submitted" || status === "streaming" ? (
            <div className="max-w-[85%] px-1 text-sm text-muted-foreground">Thinking...</div>
          ) : null}
          {error ? (
            <div className="bg-destructive/10 text-destructive max-w-[95%] rounded-md px-3 py-2 text-sm">
              {formatChatError(error)}
            </div>
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
