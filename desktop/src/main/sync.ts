import { gatewayRequest } from "./api/gateway";
import { native } from "./native";
import type { SyncProgress, SyncResult } from "./sync.types";

export type { SyncProgress, SyncResult } from "./sync.types";

let isSyncing = false;
let progressListeners: Array<(progress: SyncProgress) => void> = [];
let idRemappedListeners: Array<(oldId: number, newId: number) => void> = [];

export function onSyncProgress(cb: (progress: SyncProgress) => void): void {
  progressListeners.push(cb);
}

export function onIdRemapped(cb: (oldId: number, newId: number) => void): void {
  idRemappedListeners.push(cb);
}

function emitProgress(progress: SyncProgress): void {
  progressListeners.forEach((cb) => cb(progress));
}

/**
 * Best-effort extraction of a server-assigned id from a create response.
 * Response shapes vary per domain (`{id}`, `{trip:{id}}`, `{department:{id}}`,
 * ...) — rather than enumerate every wrapper key, check the body itself and
 * then every top-level object value for an `id` field. Stays generic, same
 * as everything else in this sync engine.
 */
function extractServerId(body: unknown): number | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;
  if (typeof record["id"] === "number") return record["id"];
  for (const value of Object.values(record)) {
    if (typeof value === "object" && value !== null) {
      const nestedId = (value as Record<string, unknown>)["id"];
      if (typeof nestedId === "number") return nestedId;
    }
  }
  return null;
}

/**
 * Replays every `pending` operation in strict creation order (see
 * native/src/lib.rs's `listPendingOperations` — ordered by the autoincrement
 * rowid, not `created_at`). Stops on the first failure: since writes are
 * always replayed in the order they were made, nothing later in the queue
 * can have been orphaned by stopping early — it simply waits for the next
 * successful run.
 */
export async function runSync(): Promise<SyncResult> {
  if (isSyncing) {
    return { synced: 0, failed: false, error: "A sync is already running." };
  }
  isSyncing = true;
  let synced = 0;

  try {
    const pending = native.listPendingOperations();
    emitProgress({ phase: "start", total: pending.length });

    for (const operation of pending) {
      native.markOperationSyncing(operation.id);

      const result = await gatewayRequest(operation.path, {
        method: operation.method,
        body: operation.body,
      });

      if (!result.ok) {
        native.markOperationFailed(operation.id, result.message);
        emitProgress({ phase: "done", synced, failed: true });
        return { synced, failed: true, error: result.message };
      }

      if (operation.localId != null) {
        const serverId = extractServerId(result.body);
        if (serverId != null) {
          native.remapNegativeId(operation.localId, serverId);
          idRemappedListeners.forEach((cb) => cb(operation.localId as number, serverId));
        }
      }

      native.removeOperation(operation.id);
      synced += 1;
      emitProgress({ phase: "progress", completed: synced, total: pending.length });
    }

    emitProgress({ phase: "done", synced, failed: false });
    return { synced, failed: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed unexpectedly.";
    emitProgress({ phase: "error", message });
    return { synced, failed: true, error: message };
  } finally {
    isSyncing = false;
  }
}
