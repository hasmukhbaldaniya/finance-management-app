import { ipcMain, type BrowserWindow } from "electron";
import { native } from "../native";
import {
  getNetworkStatus,
  onNetworkStatusChange,
  onReconnect,
  reportBrowserStatus,
  startNetworkMonitor,
} from "../network";
import { onIdRemapped, onSyncProgress, runSync } from "../sync";

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") {
    throw new TypeError(`${label} expects a string argument`);
  }
}

function assertOptionalString(value: unknown, label: string): asserts value is string | undefined {
  if (value !== undefined && value !== null && typeof value !== "string") {
    throw new TypeError(`${label} must be a string or omitted`);
  }
}

function assertOptionalNumber(value: unknown, label: string): asserts value is number | undefined {
  if (value !== undefined && value !== null && typeof value !== "number") {
    throw new TypeError(`${label} must be a number or omitted`);
  }
}

/**
 * IPC surface for the offline-first local DB. Two kinds of channels:
 * request/response ones apiManager.ts calls directly (cache read/write,
 * enqueue, pending count, manual sync, network status), and push events this
 * function wires up to `window.webContents.send` for network/sync state that
 * changes on its own schedule rather than being polled by the renderer.
 */
export function registerOfflineIpcHandlers(window: BrowserWindow): void {
  ipcMain.handle("offline:cache-get", (_event, key: unknown): string | null => {
    assertString(key, "offline:cache-get's key");
    return native.cacheGet(key);
  });

  ipcMain.handle("offline:cache-put", (_event, key: unknown, path: unknown, data: unknown) => {
    assertString(key, "offline:cache-put's key");
    assertString(path, "offline:cache-put's path");
    assertString(data, "offline:cache-put's data");
    native.cachePut(key, path, data, Date.now());
  });

  ipcMain.handle("offline:next-local-id", (): number => native.nextLocalId());

  ipcMain.handle(
    "offline:enqueue",
    (_event, method: unknown, path: unknown, body: unknown, localId: unknown): number => {
      assertString(method, "offline:enqueue's method");
      assertString(path, "offline:enqueue's path");
      assertOptionalString(body, "offline:enqueue's body");
      assertOptionalNumber(localId, "offline:enqueue's localId");
      return native.enqueueOperation(method, path, body ?? undefined, localId ?? undefined, Date.now());
    },
  );

  ipcMain.handle("offline:get-pending-count", (): number => native.getPendingCount());

  ipcMain.handle("offline:get-network-status", (): boolean => getNetworkStatus());

  ipcMain.handle("offline:report-browser-status", (_event, online: unknown) => {
    if (typeof online !== "boolean") {
      throw new TypeError("offline:report-browser-status expects a boolean argument");
    }
    reportBrowserStatus(online);
  });

  ipcMain.handle("offline:run-sync", () => runSync());

  ipcMain.handle("offline:list-stuck-operations", () => native.listStuckOperations());

  ipcMain.handle("offline:resolve-stuck-operation", (_event, id: unknown, retry: unknown) => {
    if (typeof id !== "number") {
      throw new TypeError("offline:resolve-stuck-operation's id must be a number");
    }
    if (typeof retry !== "boolean") {
      throw new TypeError("offline:resolve-stuck-operation's retry must be a boolean");
    }
    native.resolveStuckOperation(id, retry);
  });

  onNetworkStatusChange((online) => {
    window.webContents.send("offline:network-status-changed", online);
  });
  onSyncProgress((progress) => {
    window.webContents.send("offline:sync-progress", progress);
  });
  onIdRemapped((oldId, newId) => {
    window.webContents.send("offline:id-remapped", oldId, newId);
  });
  onReconnect(() => {
    void runSync();
  });

  startNetworkMonitor();
}
