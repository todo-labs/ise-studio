import { useState, useEffect, useRef } from "react";
import { Settings, AlertCircle } from "lucide-react";

import { Button } from "@ise-studio/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ise-studio/ui/dialog";
import { Input } from "@ise-studio/ui/input";
import { Label } from "@ise-studio/ui/label";
import { Badge } from "@ise-studio/ui/badge";
import { Slider } from "@ise-studio/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ise-studio/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ise-studio/ui/tabs";
import { Toggle } from "@ise-studio/ui/toggle";
import { useThemeMode } from "@ise-studio/ui/theme-provider";
import {
  clearAISettings,
  loadAISettings,
  OPENROUTER_PROVIDER,
  saveAISettings,
  saveSelectedModel,
} from "@ise-studio/core/ai";
import {
  DEFAULT_EDITOR_SETTINGS,
  loadEditorSettings,
  saveEditorSettings,
  type EditorSettings,
} from "@ise-studio/core/editor";
import { DEFAULT_DARK_PRESET_ID, THEME_PRESETS, type ThemePresetId } from "@ise-studio/ui/theme";

export function SettingsModal() {
  const [apiKey, setApiKey] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState<ThemePresetId>(DEFAULT_DARK_PRESET_ID);
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(DEFAULT_EDITOR_SETTINGS);
  const [isOpen, setIsOpen] = useState(false);
  const { presetId, setPresetId } = useThemeMode();
  const openSnapshotRef = useRef<{
    apiKey: string;
    model: string;
    presetId: ThemePresetId;
    editorSettings: EditorSettings;
  } | null>(null);

  const updateEditorSettings = (nextSettings: EditorSettings) => {
    setEditorSettings(nextSettings);
    saveEditorSettings(nextSettings);
  };

  const updateEditorSetting = <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    updateEditorSettings({ ...editorSettings, [key]: value });
  };

  useEffect(() => {
    if (!isOpen) return;

    const settings = loadAISettings();
    const currentEditorSettings = loadEditorSettings();
    setApiKey(settings.apiKey);
    setSelectedPresetId(presetId);
    setEditorSettings(currentEditorSettings);
    openSnapshotRef.current = {
      apiKey: settings.apiKey,
      model: settings.model,
      presetId,
      editorSettings: currentEditorSettings,
    };
  }, [isOpen]);

  const handleSave = () => {
    saveAISettings({ apiKey });
    setPresetId(selectedPresetId);
    saveEditorSettings(editorSettings);
    openSnapshotRef.current = null;
    setIsOpen(false);
  };

  const handleClear = () => {
    clearAISettings();
    setApiKey("");
  };

  const handleCancel = () => {
    const snapshot = openSnapshotRef.current;
    if (snapshot) {
      setApiKey(snapshot.apiKey);
      saveAISettings({ apiKey: snapshot.apiKey });
      saveSelectedModel(snapshot.model);
      setSelectedPresetId(snapshot.presetId);
      setPresetId(snapshot.presetId);
      setEditorSettings(snapshot.editorSettings);
      saveEditorSettings(snapshot.editorSettings);
    }
    openSnapshotRef.current = null;
    setIsOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isOpen) {
      handleCancel();
      return;
    }

    setIsOpen(nextOpen);
  };

  const handlePresetChange = (value: string) => {
    const nextPresetId = value as ThemePresetId;
    setSelectedPresetId(nextPresetId);
    setPresetId(nextPresetId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </DialogTitle>
          <DialogDescription>Configure AI credentials, appearance, and editor behavior.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="ai" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ai">AI</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="editor">Editor</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-4">
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
                    This app is client-only. Browser-stored keys can be read by anyone with access
                    to this browser profile.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="themePreset">Theme Preset</Label>
              <Select value={selectedPresetId} onValueChange={handlePresetChange}>
                <SelectTrigger id="themePreset" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THEME_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {THEME_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetChange(preset.id)}
                  className="border-input data-[selected=true]:border-primary data-[selected=true]:ring-ring/50 rounded-lg border p-3 text-left shadow-xs transition-[border-color,box-shadow] data-[selected=true]:ring-[3px]"
                  data-selected={selectedPresetId === preset.id}
                >
                  <div className="mb-3 flex gap-1">
                    {Object.values(preset.swatches).map((color) => (
                      <span
                        key={color}
                        className="h-6 flex-1 rounded-sm border"
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                  <div className="text-sm font-medium">{preset.name}</div>
                  <div className="text-muted-foreground text-xs capitalize">{preset.mode}</div>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="editor" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="fontSize">Font Size</Label>
                  <span className="text-muted-foreground text-xs">{editorSettings.fontSize}px</span>
                </div>
                <Slider
                  id="fontSize"
                  min={10}
                  max={24}
                  step={1}
                  value={[editorSettings.fontSize]}
                  onValueChange={([value]) => updateEditorSetting("fontSize", value ?? 14)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tabSize">Tab Size</Label>
                <Select
                  value={String(editorSettings.tabSize)}
                  onValueChange={(value) => updateEditorSetting("tabSize", Number(value))}
                >
                  <SelectTrigger id="tabSize" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 4, 6, 8].map((value) => (
                      <SelectItem key={value} value={String(value)}>
                        {value} spaces
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <EditorSelect
                label="Word Wrap"
                value={editorSettings.wordWrap}
                options={[
                  ["on", "On"],
                  ["off", "Off"],
                  ["bounded", "Bounded"],
                  ["wordWrapColumn", "Column"],
                ]}
                onChange={(value) => updateEditorSetting("wordWrap", value)}
              />

              <EditorSelect
                label="Line Numbers"
                value={editorSettings.lineNumbers}
                options={[
                  ["on", "On"],
                  ["off", "Off"],
                  ["relative", "Relative"],
                ]}
                onChange={(value) => updateEditorSetting("lineNumbers", value)}
              />

              <EditorSelect
                label="Render Whitespace"
                value={editorSettings.renderWhitespace}
                options={[
                  ["none", "None"],
                  ["boundary", "Boundary"],
                  ["selection", "Selection"],
                  ["all", "All"],
                ]}
                onChange={(value) => updateEditorSetting("renderWhitespace", value)}
              />

              <div className="grid grid-cols-2 gap-2">
                <Toggle
                  pressed={editorSettings.insertSpaces}
                  onPressedChange={(pressed) => updateEditorSetting("insertSpaces", pressed)}
                  variant="outline"
                >
                  Spaces
                </Toggle>
                <Toggle
                  pressed={editorSettings.minimap}
                  onPressedChange={(pressed) => updateEditorSetting("minimap", pressed)}
                  variant="outline"
                >
                  Minimap
                </Toggle>
                <Toggle
                  pressed={editorSettings.smoothScrolling}
                  onPressedChange={(pressed) => updateEditorSetting("smoothScrolling", pressed)}
                  variant="outline"
                  className="col-span-2"
                >
                  Smooth Scrolling
                </Toggle>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handleClear}>
            Clear AI Settings
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditorSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue as T)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, optionLabel]) => (
            <SelectItem key={optionValue} value={optionValue}>
              {optionLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
