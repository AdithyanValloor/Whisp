"use client";

import { Provider as ReduxProvider } from "react-redux";
import { store } from "@/redux/store";

import ThemeProvider from "@/app/ThemeProvider";
import MuiThemeBridge from "@/app/MuiThemeBridge";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ReduxProvider store={store}>
      <ThemeProvider>
        <MuiThemeBridge>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            {children}
          </LocalizationProvider>
        </MuiThemeBridge>
      </ThemeProvider>
    </ReduxProvider>
  );
}