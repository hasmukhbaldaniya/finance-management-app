import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        // The Rust addon is a runtime require() of a file on disk (see
        // src/main/native.ts) — bundling it would break napi's own
        // __dirname-relative lookup of the platform .node binary.
        external: (id: string) => id.includes("native/index.js") || id.endsWith(".node"),
      },
    },
  },
  preload: {
    // externalizeDeps: false, deliberately: electron-vite auto-applies
    // externalizeDepsPlugin by default even without adding it explicitly
    // (config.build.externalizeDeps defaults to true). A sandboxed preload
    // (webPreferences.sandbox: true, set in src/main/index.ts) runs under
    // Electron's restricted preloadRequire, which resolves `electron` itself
    // but cannot do normal node_modules resolution for third-party packages
    // like @electron-toolkit/preload — they must be bundled into the preload
    // output instead of left as a runtime require().
    build: {
      externalizeDeps: false,
    },
  },
  renderer: {
    resolve: {
      alias: {
        // Matches frontend/tsconfig.json's "@/*" -> "./src/*" exactly, so
        // every file ported from frontend/src/** keeps its imports unchanged.
        "@": resolve(__dirname, "src/renderer/src"),
      },
    },
    plugins: [react()],
  },
});
