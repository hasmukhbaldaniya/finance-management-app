// A plain DOM CustomEvent, not a shared function call — apiManager.ts (which
// enqueues offline writes) and OfflineContext/provider.tsx (which shows the
// pending-count badge) have no reason to import from each other otherwise.
export const OFFLINE_PENDING_CHANGED_EVENT = "offline:pending-changed";
