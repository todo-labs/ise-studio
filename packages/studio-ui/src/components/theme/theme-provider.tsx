import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  applyThemePreset,
  getPresetForMode,
  getThemePreset,
  loadAppearanceSettings,
  saveAppearanceSettings,
  type ThemeMode,
  type ThemePreset,
  type ThemePresetId,
} from "../../lib/theme";

interface ThemeContextValue {
  theme: ThemeMode;
  preset: ThemePreset;
  presetId: ThemePresetId;
  setTheme: (theme: ThemeMode) => void;
  setPresetId: (presetId: ThemePresetId) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [presetId, setPresetId] = useState<ThemePresetId>(() => loadAppearanceSettings().presetId);
  const preset = getThemePreset(presetId);
  const theme = preset.mode;

  useEffect(() => {
    applyThemePreset(preset);
    saveAppearanceSettings({ presetId });
  }, [preset, presetId]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      preset,
      presetId,
      setTheme: (nextTheme) => setPresetId(getPresetForMode(nextTheme)),
      setPresetId,
      toggleTheme: () =>
        setPresetId((currentPresetId) =>
          getThemePreset(currentPresetId).mode === "dark"
            ? getPresetForMode("light")
            : getPresetForMode("dark"),
        ),
    }),
    [preset, presetId, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within a ThemeProvider");
  }
  return context;
}
