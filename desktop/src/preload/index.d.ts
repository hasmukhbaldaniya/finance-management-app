import type { ElectronAPI } from "@electron-toolkit/preload";
import type { ScanResult } from "../../native/index.js";
import type {
  GatewayDownloadResult,
  GatewayJsonResult,
  GatewayRequestOptions,
  GatewayUploadEntry,
} from "../main/api/gateway";

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
};

declare global {
  interface Window {
    electron: ElectronAPI;
    api: DesktopApi;
  }
}
