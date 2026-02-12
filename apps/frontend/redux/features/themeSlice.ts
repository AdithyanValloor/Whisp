import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { themes, getSystemTheme } from "@/config/themeConfig";

interface ThemeState {
  current: string;
}

const getInitialTheme = (): string => {
  if (typeof window === "undefined") return themes.light;

  const saved = localStorage.getItem("theme");

  if (saved && Object.values(themes).includes(saved)) {
    return saved;
  }

  return getSystemTheme();
};

const initialState: ThemeState = {
  current: getInitialTheme(),
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<string>) {
      state.current = action.payload;
    },
    toggleTheme(state) {
      state.current =
        state.current === themes.light ? themes.dark : themes.light;
    },
  },
});

export const { setTheme, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;