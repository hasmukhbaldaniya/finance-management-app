import { createContext } from "react";

export type OfflineState = {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  syncNow: () => void;
};

export const OfflineContext = createContext<OfflineState | null>(null);
