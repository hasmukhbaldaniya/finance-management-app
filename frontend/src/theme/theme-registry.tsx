"use client";

import type { ReactNode } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { theme } from "./theme";

// `theme` (from createTheme()) contains functions (theme.breakpoints.up,
// etc.) that can't cross the Server->Client Component boundary during
// static prerendering — passing it as a prop from the Server Component
// root layout fails the build. This Client Component imports `theme`
// itself instead, so only `children` (a plain ReactNode, always
// serializable) crosses that boundary.
//
// LocalizationProvider (AdapterDateFns — date-fns is already a
// dependency, used elsewhere in this app) is mounted once here rather
// than inside date-picker.tsx/date-time-picker.tsx individually, per
// @mui/x-date-pickers' own recommendation.
export function ThemeRegistry({ children }: { children: ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: "mui" }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDateFns}>{children}</LocalizationProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
