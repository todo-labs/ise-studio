import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, GlobeIcon } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import {
  DirectChatTransport,
  getToolName,
  isTextUIPart,
  isToolUIPart,
} from "ai";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorItem,
  ModelSelectorTrigger,
  ModelSelectorValue,
} from "@/components/ai-elements/model-selector";
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { createOpenRouterChatAgent } from "@/lib/openrouter-chat-agent";
import type { EditorSelection } from "@/lib/ai-tools";
import {
  AI_SETTINGS_EVENT,
  loadAISettings,
  OPENROUTER_MODELS,
  OPENROUTER_PROVIDER,
  saveSelectedModel,
  type AISettings,
} from "@/lib/ai-settings";
import { cn } from "@/lib/utils";

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentCode?: string;
  currentSelection?: EditorSelection | null;
  onCodeChange: (code: string) => void;
}

export function AIChat({
  isOpen,
  onClose: _onClose,
  currentCode,
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
  const codeRef = useRef(currentCode ?? "");
  const selectionRef = useRef<EditorSelection | null>(currentSelection ?? null);

  useEffect(() => {
    const refreshSettings = () => setSettings(loadAISettings());
    window.addEventListener(AI_SETTINGS_EVENT, refreshSettings);
    return () => window.removeEventListener(AI_SETTINGS_EVENT, refreshSettings);
  }, []);

  useEffect(() => {
    codeRef.current = currentCode ?? "";
  }, [currentCode]);

  useEffect(() => {
    selectionRef.current = currentSelection ?? null;
  }, [currentSelection]);

  const agent = useMemo(() => {
    if (!settings.apiKey.trim()) return null;

    return createOpenRouterChatAgent({
      apiKey: settings.apiKey,
      model: settings.model,
      useWebSearch,
      getCurrentCode: () => codeRef.current,
      getCurrentSelection: () => selectionRef.current,
      onCodeUpdate: onCodeChange,
    });
  }, [onCodeChange, settings.apiKey, settings.model, useWebSearch]);

  const transport = useMemo(() => {
    if (!agent) return null;
    return new DirectChatTransport({ agent });
  }, [agent]);

  const { messages, sendMessage, status, error } = useChat({
    transport: transport ?? undefined,
  });

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
                        <MessageResponse key={`${message.id}-${index}`}>{part.text}</MessageResponse>
                      ) : null,
                    )}
                  </MessageContent>
                </Message>
              ) : (
                <div className="space-y-3 px-1 text-sm leading-6">
                  {message.parts.map((part, index) => {
                    if (isTextUIPart(part)) {
                      return (
                        <MessageResponse key={`${message.id}-${index}`}>{part.text}</MessageResponse>
                      );
                    }

                    if (part.type === "dynamic-tool" || isToolUIPart(part)) {
                      const toolName = getToolName(part);
                      const title =
                        part.state === "output-available"
                          ? `Tool result: ${toolName}`
                          : part.state === "output-error"
                            ? `Tool error: ${toolName}`
                            : `Tool call: ${toolName}`;
                      const body =
                        part.state === "output-available"
                          ? part.output
                          : part.state === "output-error"
                            ? { errorText: part.errorText }
                            : part.input;

                      return (
                        <Message from="data" key={`${message.id}-${index}`}>
                          <MessageContent className="bg-muted/60 border border-border/60">
                            <div className="space-y-1">
                              <div className="text-muted-foreground text-xs font-medium">{title}</div>
                              <pre className="text-muted-foreground max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs">
                                {JSON.stringify(body, null, 2)}
                              </pre>
                            </div>
                          </MessageContent>
                        </Message>
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
          {error ? <div className="max-w-[85%] px-1 text-sm text-red-500">{error.message}</div> : null}
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
