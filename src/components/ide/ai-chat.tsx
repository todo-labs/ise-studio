import { useEffect, useMemo, useState } from "react";
import { Bot, GlobeIcon } from "lucide-react";

import {
  Conversation,
  ConversationContent,
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
import { sendAIMessage, type ChatMessage } from "@/lib/ai-client";
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

interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
}

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
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm your ISE Studio AI assistant. I can help write, explain, and debug OpenSCAD-style DSL code.",
    },
  ]);
  const [input, setInput] = useState("");
  const [settings, setSettings] = useState<AISettings>(() =>
    typeof window === "undefined"
      ? { apiKey: "", model: OPENROUTER_PROVIDER.defaultModel }
      : loadAISettings(),
  );
  const [status, setStatus] = useState<"ready" | "submitted" | "streaming" | "error">("ready");
  const [useWebSearch, setUseWebSearch] = useState(false);

  useEffect(() => {
    const refreshSettings = () => setSettings(loadAISettings());
    window.addEventListener(AI_SETTINGS_EVENT, refreshSettings);
    return () => window.removeEventListener(AI_SETTINGS_EVENT, refreshSettings);
  }, []);

  const hasApiKey = Boolean(settings.apiKey.trim());
  const conversation = useMemo<ChatMessage[]>(
    () =>
      messages.map(({ role, content }) => ({
        role,
        content,
      })),
    [messages],
  );

  const handleModelChange = (model: string) => {
    setSettings((previous) => ({ ...previous, model }));
    saveSelectedModel(model);
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text.trim();

    if (!text || status === "submitted" || status === "streaming") return;

    const userMessage: MessageItem = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    setMessages((previous) => [...previous, userMessage]);
    setInput("");
    setStatus("submitted");

    try {
      setStatus("streaming");
      const content = await sendAIMessage({
        settings,
        messages: [...conversation, { role: "user", content: text }],
        currentCode,
        selection: currentSelection,
        useWebSearch,
        onCodeUpdate: onCodeChange,
      });

      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content,
        },
      ]);
      setStatus("ready");
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: error instanceof Error ? error.message : "OpenRouter request failed.",
        },
      ]);
      setStatus("error");
    }
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
          {messages.map((message) => (
            <Message from={message.role} key={message.id}>
              <MessageContent
                className={cn(message.role === "user" && "bg-primary text-primary-foreground")}
              >
                <MessageResponse>{message.content}</MessageResponse>
              </MessageContent>
            </Message>
          ))}
          {status === "submitted" || status === "streaming" ? (
            <Message from="assistant">
              <MessageContent>
                <span className="text-muted-foreground text-sm">Thinking...</span>
              </MessageContent>
            </Message>
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
