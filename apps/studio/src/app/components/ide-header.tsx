import { Button, buttonVariants } from "@ise-studio/ui/button";
import { MessageSquare } from "lucide-react";
import { SettingsModal } from "@/features/settings";

interface IDEHeaderProps {
  isChatOpen: boolean;
  onToggleChat: () => void;
}

export function IDEHeader({ isChatOpen, onToggleChat }: IDEHeaderProps) {
  return (
    <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 border-b backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Left side - Logo and Menu */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="bg-primary flex h-8 w-8 items-center justify-center rounded">
              <span className="text-primary-foreground text-sm font-bold">ISE</span>
            </div>
            <span className="text-lg font-semibold">ISE Studio</span>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-2">
          <Button
            variant={isChatOpen ? "default" : "ghost"}
            size="sm"
            onClick={onToggleChat}
            title={`${isChatOpen ? "Hide" : "Show"} AI Chat (⌘⇧C)`}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <a
            className={buttonVariants({ variant: "ghost", size: "sm" })}
            href="https://github.com/todo-labs/ise-studio"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub repository"
            title="GitHub repository"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              focusable="false"
            >
              <path d="M12 2C6.477 2 2 6.48 2 12.005c0 4.423 2.865 8.17 6.839 9.49.5.09.682-.217.682-.48 0-.237-.009-.868-.014-1.704-2.782.605-3.369-1.34-3.369-1.34-.455-1.156-1.11-1.465-1.11-1.465-.908-.62.069-.608.069-.608 1.004.071 1.53 1.03 1.53 1.03.892 1.529 2.341 1.087 2.91.832.09-.647.35-1.088.636-1.338-2.22-.253-4.555-1.112-4.555-4.946 0-1.09.39-1.982 1.029-2.682-.103-.253-.446-1.27.098-2.648 0 0 .84-.269 2.75 1.025A9.54 9.54 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.378.203 2.395.1 2.648.64.7 1.028 1.592 1.028 2.682 0 3.844-2.339 4.69-4.566 4.938.359.31.678.922.678 1.858 0 1.34-.012 2.422-.012 2.753 0 .265.18.575.688.478A10.01 10.01 0 0 0 22 12.005C22 6.48 17.523 2 12 2Z" />
            </svg>
          </a>
          <SettingsModal />
        </div>
      </div>
    </div>
  );
}
