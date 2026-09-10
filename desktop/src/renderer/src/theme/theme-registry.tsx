// Ported from frontend/src/theme/theme-registry.tsx, replacing its one
// Next-specific piece: @mui/material-nextjs's AppRouterCacheProvider is a
// Next App Router SSR emotion-cache-flush mechanism, meaningless without
// SSR. frontend/.storybook/preview.tsx already proves the non-Next
// replacement — a plain @emotion/cache + CacheProvider — so this file is
// that same wiring, not new design work.
import type { ReactNode } from "react";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { theme } from "./theme";

const emotionCache = createCache({ key: "mui" });

export function ThemeRegistry({ children }: { children: ReactNode }) {
  return (
    <CacheProvider value={emotionCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDateFns}>{children}</LocalizationProvider>
      </ThemeProvider>
    </CacheProvider>
  );
}
