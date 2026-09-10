import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
import type { ScanResult } from "../../native/index.js";
import type {
  GatewayDownloadResult,
  GatewayJsonResult,
  GatewayRequestOptions,
  GatewayUploadEntry,
} from "../main/api/gateway";

/**
 * The one and only surface the renderer can see.
 *
 * `electronAPI` (from @electron-toolkit/preload) is the standard narrow
 * ipcRenderer wrapper — process info + a scoped `ipcRenderer.invoke/on`, never
 * the raw `ipcRenderer` object itself. Everything app-specific gets added to
 * the second object below; it must stay narrow and explicit — never expose a
 * channel name the renderer can choose at runtime.
 */
const api = {
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  ping: (name: string): Promise<string> => ipcRenderer.invoke("native:ping", name),
  receipts: {
    pickFolder: (): Promise<string | null> => ipcRenderer.invoke("native:pickFolder"),
    scanFolder: (root: string): Promise<ScanResult> => ipcRenderer.invoke("native:scanFolder", root),
  },
  // The whole gateway bridge (see src/main/api/gateway.ts) — every one of the
  // ~100 ported apis/**/*.api.ts files reaches gateway-service through these
  // three channels via the rewritten apiManager.ts primitives, never
  // directly. Never expose more surface here; add to gateway.ts instead.
  gateway: {
    request: (path: string, options?: GatewayRequestOptions): Promise<GatewayJsonResult> =>
      ipcRenderer.invoke("gateway:request", path, options),
    upload: (path: string, entries: GatewayUploadEntry[]): Promise<GatewayJsonResult> =>
      ipcRenderer.invoke("gateway:upload", path, entries),
    download: (path: string): Promise<GatewayDownloadResult> => ipcRenderer.invoke("gateway:download", path),
  },
};

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld("electron", electronAPI);
  contextBridge.exposeInMainWorld("api", api);
} else {
  // contextIsolation is always on in this app (see src/main/index.ts) — this
  // branch only exists so preload doesn't crash if that ever changes.
  // @ts-expect-error — window augmentation only valid without context isolation
  window.electron = electronAPI;
  // @ts-expect-error — window augmentation only valid without context isolation
  window.api = api;
}
