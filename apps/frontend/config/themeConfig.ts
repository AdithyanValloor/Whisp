export const themes = {
  light: "light",  
  // light: "retro",  
  dark: "forest",
  // dark: "sunset",
  // dark: "business",
  // dark: "dim",
  // dark: "dark",
  // dark: "abyss",
};

export const getSystemTheme = (): string => {
  if (typeof window !== "undefined") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? themes.dark : themes.light;
  }
  return themes.light;
};

