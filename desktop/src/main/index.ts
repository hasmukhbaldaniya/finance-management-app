import path from "node:path";
import { app, BrowserWindow } from "electron";
import { is } from "@electron-toolkit/utils";
import { initLocalDb } from "./db";
import { registerNativeIpcHandlers } from "./ipc/native.ipc";
import { registerGatewayIpcHandlers } from "./ipc/gateway.ipc";
import { registerOfflineIpcHandlers } from "./ipc/offline.ipc";

/**
 * A single window loading the Vite-built renderer (dev: the Vite dev server;
 * prod: out/renderer/index.html).
 *
 * Security switches are set here and never relaxed: the renderer is sandboxed,
 * has no Node integration, and reaches privileged work only through the narrow
 * contextBridge surface defined in src/preload/index.ts.
 */
function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 940,
    minHeight: 600,
    show: false,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Avoid the white flash: paint only once the renderer has something to show.
  window.once("ready-to-show", () => {
    window.show();
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    window.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    window.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  }

  return window;
}

app.whenReady().then(() => {
  // Must run before registerOfflineIpcHandlers — every offline:* channel
  // calls into the native addon's DB functions, which throw until initDb()
  // has been called once.
  initLocalDb();

  registerNativeIpcHandlers();
  registerGatewayIpcHandlers();
  const window = createWindow();
  registerOfflineIpcHandlers(window);

  // macOS: clicking the dock icon with no windows open re-creates one.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// macOS: closing every window does not quit the app.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
