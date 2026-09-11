import type { ElectronAPI } from "@electron-toolkit/preload";
import type { PendingOperation, ScanResult } from "../../native/index.js";
import type {
  GatewayDownloadResult,
  GatewayJsonResult,
  GatewayRequestOptions,
  GatewayUploadEntry,
} from "../main/api/gateway";
import type { SyncProgress, SyncResult } from "../main/sync.types";

export type DesktopApi = {
  versions: {
    electron: string;
    chrome: string;
    node: string;
  };
  ping: (name: string) => Promise<string>;
  receipts: {
    pickFolder: () => Promise<string | null>;
    scanFolder: (root: string) => Promise<ScanResult>;
  };
  gateway: {
    request: (path: string, options?: GatewayRequestOptions) => Promise<GatewayJsonResult>;
    upload: (path: string, entries: GatewayUploadEntry[]) => Promise<GatewayJsonResult>;
    download: (path: string) => Promise<GatewayDownloadResult>;
  };
  offline: {
    cacheGet: (key: string) => Promise<string | null>;
    cachePut: (key: string, path: string, data: string) => Promise<void>;
    nextLocalId: () => Promise<number>;
    enqueue: (method: string, path: string, body?: string, localId?: number) => Promise<number>;
    getPendingCount: () => Promise<number>;
    getNetworkStatus: () => Promise<boolean>;
    reportBrowserStatus: (online: boolean) => Promise<void>;
    runSync: () => Promise<SyncResult>;
    listStuckOperations: () => Promise<PendingOperation[]>;
    resolveStuckOperation: (id: number, retry: boolean) => Promise<void>;
    onNetworkStatusChange: (cb: (online: boolean) => void) => () => void;
    onSyncProgress: (cb: (progress: SyncProgress) => void) => () => void;
    onIdRemapped: (cb: (oldId: number, newId: number) => void) => () => void;
  };
};

declare global {
  interface Window {
    electron: ElectronAPI;
    api: DesktopApi;
  }
}
