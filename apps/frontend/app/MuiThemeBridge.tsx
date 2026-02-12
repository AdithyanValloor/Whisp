"use client";

import { CssBaseline, ThemeProvider } from "@mui/material";
import { useAppSelector } from "@/redux/hooks";
import { createMuiTheme } from "@/lib/muiTheme";
import { useMemo, useEffect, useState } from "react";

export default function MuiThemeBridge({
  children,
}: {
  children: React.ReactNode;
}) {
  const daisyTheme = useAppSelector((state) => state.theme.current);
  const mode = daisyTheme === "light" ? "light" : "dark";
  const [mounted, setMounted] = useState(false);

  const muiTheme = useMemo(() => createMuiTheme(mode), [mode]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render MUI theme until client-side hydration is complete
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}