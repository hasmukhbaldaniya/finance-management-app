import { useContext } from "react";
import { OfflineContext, type OfflineState } from "./context";

export function useOffline(): OfflineState {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOffline must be used within an OfflineProvider");
  }
  return context;
}
