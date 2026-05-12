export type ThemeMode = "light" | "dark";
export type ThemePresetId =
  | "github-light"
  | "cursor"
  | "vesper"
  | "tokyo-night"
  | "catppuccin"
  | "kanagawa"
  | "everforest"
  | "rose-pine"
  | "nord";

interface ThemePalette {
  neutral: string;
  ink: string;
  primary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  textWeak: string;
}

interface SyntaxPalette {
  comment: string;
  keyword: string;
  string: string;
  primitive: string;
  property: string;
  type: string;
  constant: string;
  operator: string;
}

export interface ThemePreset {
  id: ThemePresetId;
  name: string;
  mode: ThemeMode;
  monacoTheme: string;
  swatches: {
    background: string;
    foreground: string;
    primary: string;
    accent: string;
  };
  tokens: Record<string, string>;
  editor: {
    background: string;
    foreground: string;
    lineHighlight: string;
    selection: string;
    border: string;
    syntax: SyntaxPalette;
  };
}

export interface AppearanceSettings {
  presetId: ThemePresetId;
}

export const THEME_STORAGE_KEY = "ise-theme";
export const APPEARANCE_STORAGE_KEY = "ise-appearance";

export const DEFAULT_LIGHT_PRESET_ID: ThemePresetId = "github-light";
export const DEFAULT_DARK_PRESET_ID: ThemePresetId = "cursor";

function createPreset({
  id,
  name,
  mode,
  palette,
  syntax,
  surface,
  surfaceStrong,
  selection,
  border,
}: {
  id: ThemePresetId;
  name: string;
  mode: ThemeMode;
  palette: ThemePalette;
  syntax: SyntaxPalette;
  surface?: string;
  surfaceStrong?: string;
  selection?: string;
  border?: string;
}): ThemePreset {
  const card = surface ?? palette.neutral;
  const muted = surfaceStrong ?? card;
  const borderColor = border ?? palette.textWeak;

  return {
    id,
    name,
    mode,
    monacoTheme: `ise-${id}`,
    swatches: {
      background: palette.neutral,
      foreground: palette.ink,
      primary: palette.primary,
      accent: palette.accent,
    },
    tokens: {
      background: palette.neutral,
      foreground: palette.ink,
      card,
      "card-foreground": palette.ink,
      popover: card,
      "popover-foreground": palette.ink,
      primary: palette.primary,
      "primary-foreground": mode === "dark" ? "#121212" : "#ffffff",
      secondary: muted,
      "secondary-foreground": palette.ink,
      muted,
      "muted-foreground": palette.textWeak,
      accent: muted,
      "accent-foreground": palette.ink,
      destructive: palette.error,
      "destructive-foreground": mode === "dark" ? "#121212" : "#ffffff",
      border: borderColor,
      input: borderColor,
      ring: palette.primary,
      "chart-1": palette.primary,
      "chart-2": palette.accent,
      "chart-3": palette.success,
      "chart-4": palette.warning,
      "chart-5": palette.info,
      sidebar: mode === "dark" ? "#121212" : card,
      "sidebar-foreground": palette.ink,
      "sidebar-primary": palette.primary,
      "sidebar-primary-foreground": mode === "dark" ? "#121212" : "#ffffff",
      "sidebar-accent": muted,
      "sidebar-accent-foreground": palette.ink,
      "sidebar-border": borderColor,
      "sidebar-ring": palette.primary,
    },
    editor: {
      background: palette.neutral,
      foreground: palette.ink,
      lineHighlight: card,
      selection: selection ?? muted,
      border: borderColor,
      syntax,
    },
  };
}

export const THEME_PRESETS: ThemePreset[] = [
  createPreset({
    id: "github-light",
    name: "GitHub Light",
    mode: "light",
    palette: {
      neutral: "#ffffff",
      ink: "#24292f",
      primary: "#0969da",
      accent: "#1b7c83",
      success: "#1a7f37",
      warning: "#9a6700",
      error: "#cf222e",
      info: "#bc4c00",
      textWeak: "#57606a",
    },
    syntax: {
      comment: "#57606a",
      keyword: "#cf222e",
      string: "#0969da",
      primitive: "#8250df",
      property: "#1b7c83",
      type: "#bc4c00",
      constant: "#1b7c83",
      operator: "#cf222e",
    },
    surface: "#f6f8fa",
    surfaceStrong: "#eaeef2",
    selection: "#dbeafe",
    border: "#d0d7de",
  }),
  createPreset({
    id: "cursor",
    name: "Cursor",
    mode: "dark",
    palette: {
      neutral: "#181818",
      ink: "#e4e4e4",
      primary: "#88c0d0",
      accent: "#88c0d0",
      success: "#3fa266",
      warning: "#f1b467",
      error: "#e34671",
      info: "#81a1c1",
      textWeak: "#e4e4e45e",
    },
    syntax: {
      comment: "#8a8a8a",
      keyword: "#82D2CE",
      string: "#E394DC",
      primitive: "#EFB080",
      property: "#81a1c1",
      type: "#EFB080",
      constant: "#F8C762",
      operator: "#e4e4e4",
    },
    surface: "#212121",
    surfaceStrong: "#2b2b2b",
    selection: "#303030",
    border: "#3a3a3a",
  }),
  createPreset({
    id: "vesper",
    name: "Vesper",
    mode: "dark",
    palette: {
      neutral: "#101010",
      ink: "#ffffff",
      primary: "#FFC799",
      accent: "#FF8080",
      success: "#99FFE4",
      warning: "#FFC799",
      error: "#FF8080",
      info: "#FFC799",
      textWeak: "#8b8b8b",
    },
    syntax: {
      comment: "#8b8b8b",
      keyword: "#a0a0a0",
      string: "#99ffe4",
      primitive: "#ffc799",
      property: "#ffffff",
      type: "#ffc799",
      constant: "#ffc799",
      operator: "#ffffff",
    },
    surface: "#181818",
    surfaceStrong: "#252525",
    selection: "#303030",
    border: "#343434",
  }),
  createPreset({
    id: "tokyo-night",
    name: "Tokyo Night",
    mode: "dark",
    palette: {
      neutral: "#1a1b26",
      ink: "#c0caf5",
      primary: "#7aa2f7",
      accent: "#ff9e64",
      success: "#9ece6a",
      warning: "#e0af68",
      error: "#f7768e",
      info: "#7dcfff",
      textWeak: "#565f89",
    },
    syntax: {
      comment: "#565f89",
      keyword: "#bb9af7",
      string: "#9ece6a",
      primitive: "#7aa2f7",
      property: "#7dcfff",
      type: "#e0af68",
      constant: "#ff9e64",
      operator: "#89ddff",
    },
    surface: "#202230",
    surfaceStrong: "#292e42",
    selection: "#283457",
    border: "#3b4261",
  }),
  createPreset({
    id: "catppuccin",
    name: "Catppuccin",
    mode: "dark",
    palette: {
      neutral: "#1e1e2e",
      ink: "#cdd6f4",
      primary: "#b4befe",
      accent: "#f4b8e4",
      success: "#a6d189",
      warning: "#f9e2af",
      error: "#f38ba8",
      info: "#89dceb",
      textWeak: "#a6adc8",
    },
    syntax: {
      comment: "#a6adc8",
      keyword: "#cba6f7",
      string: "#a6e3a1",
      primitive: "#f38ba8",
      property: "#b4befe",
      type: "#f9e2af",
      constant: "#89dceb",
      operator: "#f5c2e7",
    },
    surface: "#211f31",
    surfaceStrong: "#313244",
    selection: "#45475a",
    border: "#4a4763",
  }),
  createPreset({
    id: "kanagawa",
    name: "Kanagawa",
    mode: "dark",
    palette: {
      neutral: "#1F1F28",
      ink: "#DCD7BA",
      primary: "#7E9CD8",
      accent: "#D27E99",
      success: "#98BB6C",
      warning: "#D7A657",
      error: "#E82424",
      info: "#76946A",
      textWeak: "#727169",
    },
    syntax: {
      comment: "#727169",
      keyword: "#957FB8",
      string: "#98BB6C",
      primitive: "#7E9CD8",
      property: "#76946A",
      type: "#C38D9D",
      constant: "#D7A657",
      operator: "#D27E99",
    },
    surface: "#252535",
    surfaceStrong: "#2a2a37",
    selection: "#363646",
    border: "#54546d",
  }),
  createPreset({
    id: "everforest",
    name: "Everforest",
    mode: "dark",
    palette: {
      neutral: "#2d353b",
      ink: "#d3c6aa",
      primary: "#a7c080",
      accent: "#d699b6",
      success: "#a7c080",
      warning: "#e69875",
      error: "#e67e80",
      info: "#83c092",
      textWeak: "#7a8478",
    },
    syntax: {
      comment: "#7a8478",
      keyword: "#d699b6",
      string: "#a7c080",
      primitive: "#a7c080",
      property: "#83c092",
      type: "#dbbc7f",
      constant: "#e69875",
      operator: "#83c092",
    },
    surface: "#333c43",
    surfaceStrong: "#3a464c",
    selection: "#475258",
    border: "#59665f",
  }),
  createPreset({
    id: "rose-pine",
    name: "Rose Pine",
    mode: "dark",
    palette: {
      neutral: "#191724",
      ink: "#e0def4",
      primary: "#9ccfd8",
      accent: "#ebbcba",
      success: "#31748f",
      warning: "#f6c177",
      error: "#eb6f92",
      info: "#9ccfd8",
      textWeak: "#6e6a86",
    },
    syntax: {
      comment: "#6e6a86",
      keyword: "#31748f",
      string: "#f6c177",
      primitive: "#ebbcba",
      property: "#ebbcba",
      type: "#9ccfd8",
      constant: "#c4a7e7",
      operator: "#908caa",
    },
    surface: "#1f1d2e",
    surfaceStrong: "#26233a",
    selection: "#403d52",
    border: "#403d52",
  }),
  createPreset({
    id: "nord",
    name: "Nord",
    mode: "dark",
    palette: {
      neutral: "#2e3440",
      ink: "#e5e9f0",
      primary: "#88c0d0",
      accent: "#d57780",
      success: "#a3be8c",
      warning: "#d08770",
      error: "#bf616a",
      info: "#81a1c1",
      textWeak: "#616e88",
    },
    syntax: {
      comment: "#616e88",
      keyword: "#81a1c1",
      string: "#a3be8c",
      primitive: "#88c0d0",
      property: "#81a1c1",
      type: "#d08770",
      constant: "#b48ead",
      operator: "#e5e9f0",
    },
    surface: "#3b4252",
    surfaceStrong: "#434c5e",
    selection: "#4c566a",
    border: "#4c566a",
  }),
];

export function getSystemTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return getSystemTheme();
}

export function getThemePreset(presetId: ThemePresetId): ThemePreset {
  return THEME_PRESETS.find((preset) => preset.id === presetId) ?? THEME_PRESETS[0]!;
}

export function getPresetForMode(theme: ThemeMode): ThemePresetId {
  return theme === "dark" ? DEFAULT_DARK_PRESET_ID : DEFAULT_LIGHT_PRESET_ID;
}

function isThemePresetId(value: unknown): value is ThemePresetId {
  return THEME_PRESETS.some((preset) => preset.id === value);
}

export function loadAppearanceSettings(): AppearanceSettings {
  if (typeof window === "undefined") {
    return { presetId: DEFAULT_DARK_PRESET_ID };
  }

  try {
    const storedAppearance = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (storedAppearance) {
      const parsed = JSON.parse(storedAppearance) as Partial<AppearanceSettings>;
      if (isThemePresetId(parsed.presetId)) {
        return { presetId: parsed.presetId };
      }
    }
  } catch {
    // Fall back to legacy theme or system preference.
  }

  return { presetId: getPresetForMode(getInitialTheme()) };
}

export function saveAppearanceSettings(settings: AppearanceSettings) {
  if (typeof window === "undefined") return;

  const presetId = isThemePresetId(settings.presetId) ? settings.presetId : DEFAULT_DARK_PRESET_ID;
  window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify({ presetId }));
  window.localStorage.setItem(THEME_STORAGE_KEY, getThemePreset(presetId).mode);
}

export function applyThemePreset(preset: ThemePreset) {
  const root = document.documentElement;
  root.classList.toggle("dark", preset.mode === "dark");
  root.style.colorScheme = preset.mode;
  root.dataset.themePreset = preset.id;

  for (const [token, value] of Object.entries(preset.tokens)) {
    root.style.setProperty(`--${token}`, value);
  }
}

export function applyTheme(theme: ThemeMode) {
  applyThemePreset(getThemePreset(getPresetForMode(theme)));
}
