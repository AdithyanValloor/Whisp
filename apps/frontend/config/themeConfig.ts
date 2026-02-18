
export const AVAILABLE_THEMES = [
  "light",
  "forest",
  "sunset",
  "business",
  "dracula",
  "lemonade",
  "retro",
] as const;

export const THEME_LABELS: Record<AppTheme, string> = {
  light: "Light",
  forest: "Dark",
  sunset: "Teal",
  business: "Corporate",
  dracula: "Midnight",
  lemonade: "Sage",
  retro: "Sunset",
  system: "System",
};

export type DaisyTheme = typeof AVAILABLE_THEMES[number];

export type AppTheme = DaisyTheme | "system";

export const getSystemTheme = (): AppTheme => {
  if (typeof window !== "undefined") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "forest" : "light";
  }
  return "light";
};
