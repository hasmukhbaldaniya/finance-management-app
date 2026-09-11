import { useCallback, useEffect, useState, type ReactNode } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OFFLINE_PENDING_CHANGED_EVENT } from "@/utils/constants/offline.constant";
import { OfflineContext } from "./context";

type StuckOperation = { id: number; method: string; path: string; status: string; lastError?: string };

// apiManager.ts dispatches OFFLINE_PENDING_CHANGED_EVENT immediately after
// enqueuing a write, so the badge updates without waiting for the poll below
// — the interval is only a backstop in case an event is ever missed.
const PENDING_COUNT_POLL_MS = 15_000;

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [stuckOperations, setStuckOperations] = useState<StuckOperation[]>([]);

  const refreshPendingCount = useCallback(() => {
    void window.api.offline.getPendingCount().then(setPendingCount);
  }, []);

  const syncNow = useCallback(() => {
    void window.api.offline.runSync().then((result) => {
      refreshPendingCount();
      if (result.error && result.error !== "A sync is already running.") {
        toast.error(result.error);
      }
    });
  }, [refreshPendingCount]);

  // Covers two cases neither of which runSync will ever retry on its own:
  // a "syncing" row left over from a crash/force-quit mid-request (the
  // server may already have received it, so it needs an explicit choice
  // rather than a silent retry), and a "failed" row from a genuine error
  // (e.g. a 404 for something already deleted server-side by someone else)
  // — runSync stops the whole queue on the first failure, so a permanently
  // failing operation would otherwise jam every later write behind it
  // forever with no way to clear it.
  const refreshStuckOperations = useCallback(() => {
    void window.api.offline.listStuckOperations().then((rows) => {
      setStuckOperations(rows.map(({ id, method, path, status, lastError }) => ({ id, method, path, status, lastError })));
    });
  }, []);

  useEffect(() => {
    refreshStuckOperations();
  }, [refreshStuckOperations]);

  useEffect(() => {
    void window.api.offline.getNetworkStatus().then(setIsOnline);
    refreshPendingCount();

    const unsubscribeStatus = window.api.offline.onNetworkStatusChange(setIsOnline);
    const unsubscribeProgress = window.api.offline.onSyncProgress((progress) => {
      if (progress.phase === "start") {
        setIsSyncing(true);
        return;
      }
      if (progress.phase === "done" || progress.phase === "error") {
        setIsSyncing(false);
        refreshPendingCount();
        if (progress.phase === "done" && progress.failed) {
          toast.error("Some changes couldn't be synced yet — they'll retry automatically once back online.");
          refreshStuckOperations();
        } else if (progress.phase === "done" && progress.synced > 0) {
          toast.success(`Synced ${progress.synced} offline change${progress.synced === 1 ? "" : "s"}.`);
        }
      }
    });

    window.addEventListener(OFFLINE_PENDING_CHANGED_EVENT, refreshPendingCount);
    const interval = setInterval(refreshPendingCount, PENDING_COUNT_POLL_MS);

    function handleBrowserOnline(): void {
      void window.api.offline.reportBrowserStatus(true);
    }
    function handleBrowserOffline(): void {
      void window.api.offline.reportBrowserStatus(false);
    }
    window.addEventListener("online", handleBrowserOnline);
    window.addEventListener("offline", handleBrowserOffline);

    return () => {
      unsubscribeStatus();
      unsubscribeProgress();
      window.removeEventListener(OFFLINE_PENDING_CHANGED_EVENT, refreshPendingCount);
      clearInterval(interval);
      window.removeEventListener("online", handleBrowserOnline);
      window.removeEventListener("offline", handleBrowserOffline);
    };
  }, [refreshPendingCount, refreshStuckOperations]);

  function resolveStuckOperation(id: number, retry: boolean): void {
    void window.api.offline.resolveStuckOperation(id, retry).then(() => {
      setStuckOperations((current) => current.filter((op) => op.id !== id));
      refreshPendingCount();
    });
  }

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, isSyncing, syncNow }}>
      {children}
      <Dialog open={stuckOperations.length > 0} onOpenChange={() => undefined}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm {stuckOperations.length === 1 ? "an action" : "some actions"}</DialogTitle>
            <DialogDescription>
              {stuckOperations.length === 1 ? "This change" : "These changes"} couldn't be confirmed as synced —
              either the app closed unexpectedly mid-sync (it may have already reached the server), or it failed for
              another reason and is blocking later changes from syncing. Choose retry only if you're sure it didn't
              already go through.
            </DialogDescription>
          </DialogHeader>
          <Stack spacing={1.5}>
            {stuckOperations.map((op) => (
              <Stack
                key={op.id}
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", justifyContent: "space-between", border: 1, borderColor: "divider", borderRadius: 1, px: 1.5, py: 1 }}
              >
                <Stack spacing={0.25}>
                  <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                    {op.method} {op.path}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {op.status === "syncing" ? "Interrupted mid-sync" : (op.lastError ?? "Failed to sync")}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button variant="outline" size="sm" onClick={() => resolveStuckOperation(op.id, false)}>
                    Discard
                  </Button>
                  <Button size="sm" onClick={() => resolveStuckOperation(op.id, true)}>
                    Retry
                  </Button>
                </Stack>
              </Stack>
            ))}
          </Stack>
          <DialogFooter>
            <Typography variant="caption" color="text.secondary">
              This choice can't be undone — pick discard only if you're confident it never reached the server.
            </Typography>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OfflineContext.Provider>
  );
}
