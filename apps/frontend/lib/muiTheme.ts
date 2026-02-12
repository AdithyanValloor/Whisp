import { createTheme } from "@mui/material/styles";
import "@mui/x-date-pickers/themeAugmentation";

export const createMuiTheme = (mode: "light" | "dark") =>
  createTheme({
    palette: {
      mode,
      ...(mode === "dark" && {
        background: {
          paper: "#000000",
          default: "#171e29",
        },
      }),
    },
  });