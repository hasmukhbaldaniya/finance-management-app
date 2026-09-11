import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
import type { PendingOperation, ScanResult } from "../../native/index.js";
import type {
  GatewayDownloadResult,
  GatewayJsonResult,
  GatewayRequestOptions,
  GatewayUploadEntry,
} from "../main/api/gateway";
import type { SyncProgress, SyncResult } from "../main/sync.types";

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
  // The offline-first local DB (see native/src/lib.rs, src/main/{db,network,sync}.ts).
  // apiManager.ts's apiCall is the only caller of the request/response
  // channels below; the on* subscriptions back the global offline badge/sync
  // button in header.tsx. Never expose more surface here than these two
  // shapes need — same rule as `gateway` above.
  offline: {
    cacheGet: (key: string): Promise<string | null> => ipcRenderer.invoke("offline:cache-get", key),
    cachePut: (key: string, path: string, data: string): Promise<void> =>
      ipcRenderer.invoke("offline:cache-put", key, path, data),
    nextLocalId: (): Promise<number> => ipcRenderer.invoke("offline:next-local-id"),
    enqueue: (method: string, path: string, body?: string, localId?: number): Promise<number> =>
      ipcRenderer.invoke("offline:enqueue", method, path, body, localId),
    getPendingCount: (): Promise<number> => ipcRenderer.invoke("offline:get-pending-count"),
    getNetworkStatus: (): Promise<boolean> => ipcRenderer.invoke("offline:get-network-status"),
    reportBrowserStatus: (online: boolean): Promise<void> =>
      ipcRenderer.invoke("offline:report-browser-status", online),
    runSync: (): Promise<SyncResult> => ipcRenderer.invoke("offline:run-sync"),
    listStuckOperations: (): Promise<PendingOperation[]> => ipcRenderer.invoke("offline:list-stuck-operations"),
    resolveStuckOperation: (id: number, retry: boolean): Promise<void> =>
      ipcRenderer.invoke("offline:resolve-stuck-operation", id, retry),
    onNetworkStatusChange: (cb: (online: boolean) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, online: boolean): void => cb(online);
      ipcRenderer.on("offline:network-status-changed", listener);
      return () => ipcRenderer.removeListener("offline:network-status-changed", listener);
    },
    onSyncProgress: (cb: (progress: SyncProgress) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, progress: SyncProgress): void => cb(progress);
      ipcRenderer.on("offline:sync-progress", listener);
      return () => ipcRenderer.removeListener("offline:sync-progress", listener);
    },
    onIdRemapped: (cb: (oldId: number, newId: number) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, oldId: number, newId: number): void => cb(oldId, newId);
      ipcRenderer.on("offline:id-remapped", listener);
      return () => ipcRenderer.removeListener("offline:id-remapped", listener);
    },
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
