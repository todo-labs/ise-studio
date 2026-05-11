import { useState, useEffect } from "react";
import { Settings, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  clearAISettings,
  loadAISettings,
  OPENROUTER_PROVIDER,
  saveAISettings,
} from "@/lib/ai-settings";

export function SettingsModal() {
  const [apiKey, setApiKey] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const settings = loadAISettings();
    setApiKey(settings.apiKey);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const settings = loadAISettings();
    setApiKey(settings.apiKey);
  }, [isOpen]);

  const handleSave = () => {
    saveAISettings({ apiKey });
    setIsOpen(false);
  };

  const handleClear = () => {
    clearAISettings();
    setApiKey("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </DialogTitle>
          <DialogDescription>Configure your OpenRouter API key for ISE Studio.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type="password"
                placeholder={`Enter your ${OPENROUTER_PROVIDER.name} API key (${OPENROUTER_PROVIDER.placeholder})`}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10"
              />
              {apiKey && (
                <div className="absolute top-1/2 right-3 -translate-y-1/2">
                  <Badge variant="secondary" className="text-xs">
                    Set
                  </Badge>
                </div>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              Your key is stored locally and sent directly from this browser to OpenRouter.
            </p>
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="mt-0.5 h-4 w-4 text-amber-500" />
              <div className="text-muted-foreground text-xs">
                <p className="text-foreground font-medium">Security Notice</p>
                <p>
                  This app is client-only. Browser-stored keys can be read by anyone with access to
                  this browser profile.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handleClear}>
            Clear All
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!apiKey}>
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
