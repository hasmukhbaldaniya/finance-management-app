import { ipcMain } from "electron";
import { gatewayDownload, gatewayRequest, gatewayUpload } from "../api/gateway";
import type { GatewayRequestOptions, GatewayUploadEntry } from "../api/gateway";

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") {
    throw new TypeError(`${label} expects a string argument`);
  }
}

/**
 * The whole IPC surface for the ~100 ported `apis/**` endpoint files: three
 * generic channels (one per apiManager.ts primitive), never one per
 * endpoint. See the plan's "gateway bridge" section for why.
 */
export function registerGatewayIpcHandlers(): void {
  ipcMain.handle("gateway:request", (_event, path: unknown, options: unknown) => {
    assertString(path, "gateway:request's path");
    return gatewayRequest(path, (options ?? {}) as GatewayRequestOptions);
  });

  ipcMain.handle("gateway:upload", (_event, path: unknown, entries: unknown) => {
    assertString(path, "gateway:upload's path");
    if (!Array.isArray(entries)) {
      throw new TypeError("gateway:upload expects an array of entries");
    }
    return gatewayUpload(path, entries as GatewayUploadEntry[]);
  });

  ipcMain.handle("gateway:download", (_event, path: unknown) => {
    assertString(path, "gateway:download's path");
    return gatewayDownload(path);
  });
}
