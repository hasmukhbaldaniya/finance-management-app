import { BrowserWindow, dialog, ipcMain } from "electron";
import { native } from "../native";
import type { ScanResult } from "../../../native/index.js";

/**
 * The only place ipcMain.handle is called for native-addon channels.
 * Registered once from src/main/index.ts at startup.
 */
export function registerNativeIpcHandlers(): void {
  ipcMain.handle("native:ping", (_event, name: unknown) => {
    if (typeof name !== "string") {
      throw new TypeError("native:ping expects a string argument");
    }
    return native.ping(name);
  });

  // Folder selection is a main-process/OS concern (dialog.showOpenDialog),
  // kept separate from the Rust scan itself so a caller can scan a
  // known path directly without prompting (useful once Phase 10 wires this
  // into a real receipt-upload flow).
  ipcMain.handle("native:pickFolder", async (event): Promise<string | null> => {
    const window = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const result = await dialog.showOpenDialog(window as BrowserWindow, {
      properties: ["openDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle("native:scanFolder", (_event, root: unknown): ScanResult => {
    if (typeof root !== "string") {
      throw new TypeError("native:scanFolder expects a string path argument");
    }
    return native.scanFolder(root);
  });
}
