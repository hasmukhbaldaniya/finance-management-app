import type { Preview } from "@storybook/react-vite";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { theme } from "../src/theme/theme";
import "../src/app/globals.css";

// Storybook has no Next.js App Router to thread an emotion cache through,
// so it uses a plain `@emotion/cache` instance instead of
// `AppRouterCacheProvider` — no Next-specific requirement here, just the
// same `ThemeProvider`/`theme.ts` every real page gets via app/layout.tsx
// (026's Establish the MUI Theme & Colors Foundation story).
const emotionCache = createCache({ key: "mui-storybook" });

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <CacheProvider value={emotionCache}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Story />
        </ThemeProvider>
      </CacheProvider>
    ),
  ],
};

export default preview;
