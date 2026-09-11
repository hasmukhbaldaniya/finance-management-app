import { gatewayRequest } from "./api/gateway";

// `navigator.onLine` (the renderer's OS-level signal, forwarded here via
// reportBrowserStatus) only reflects whether the machine has a network
// interface up — not whether gateway-service is actually reachable. This
// module is the authoritative source of truth for "can we actually sync
// right now", verified by a real request, and everything else (the offline
// badge, auto-sync) reacts to *this* state, never to navigator.onLine
// directly.
const POLL_INTERVAL_MS = 20_000;

let isOnline = true; // optimistic default; corrected by the first poll below
let statusListeners: Array<(online: boolean) => void> = [];
let reconnectListeners: Array<() => void> = [];

export function getNetworkStatus(): boolean {
  return isOnline;
}

export function onNetworkStatusChange(cb: (online: boolean) => void): void {
  statusListeners.push(cb);
}

/** Fires once, exactly on a false -> true transition — the auto-sync trigger. */
export function onReconnect(cb: () => void): void {
  reconnectListeners.push(cb);
}

async function checkReachability(): Promise<boolean> {
  // Any real HTTP response (even a 401 for an unauthenticated caller) proves
  // gateway-service is reachable; only a transport-level failure (the
  // existing status:0 signal from gateway.ts) means we're actually offline.
  const result = await gatewayRequest("/auth/me", { method: "GET" });
  return result.status !== 0;
}

function setOnlineState(next: boolean): void {
  if (next === isOnline) return;
  const wasOffline = !isOnline;
  isOnline = next;
  statusListeners.forEach((cb) => cb(isOnline));
  if (isOnline && wasOffline) {
    reconnectListeners.forEach((cb) => cb());
  }
}

async function pollOnce(): Promise<void> {
  const reachable = await checkReachability();
  setOnlineState(reachable);
}

/** The renderer's `window.addEventListener("online"/"offline")` signal. */
export function reportBrowserStatus(online: boolean): void {
  if (online) {
    // Confirm with a real probe immediately rather than waiting up to
    // POLL_INTERVAL_MS for the next scheduled check.
    void pollOnce();
  } else {
    setOnlineState(false);
  }
}

export function startNetworkMonitor(): void {
  void pollOnce();
  setInterval(() => void pollOnce(), POLL_INTERVAL_MS);
}
