import "@fontsource-variable/montserrat/wght.css";
import "@fontsource-variable/montserrat/wght-italic.css";
import "./styles/global.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router";
import Box from "@mui/material/Box";
import { ThemeRegistry } from "./theme/theme-registry";
import { Toaster } from "./components/ui/toast";
import { AppRoutes } from "./routes";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root not found");
}

// HashRouter, not BrowserRouter: a packaged Electron window loads over
// file://, which has no server to resolve a deep sub-path on reload —
// HashRouter keeps the whole route in the URL fragment, which file://
// already satisfies unconditionally. See the plan's "Scope expansion"
// section for the full reasoning.
ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <ThemeRegistry>
      {/* Stands in for frontend/src/app/layout.tsx's <Box component="body">
          wrapper — index.html's real <body> isn't React-rendered here. */}
      <Box sx={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
        <Toaster />
      </Box>
    </ThemeRegistry>
  </React.StrictMode>,
);
