"use client";

import { useEffect, useState } from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

// 026's MUI Migration — replaces the `sonner` package entirely. MUI has no
// built-in imperative "fire and forget" toast function the way sonner's
// own `toast.success(...)` does, so this is genuinely new app-level
// infrastructure, not a like-for-like wrapper: a small module-level
// pub/sub queue (mirroring how sonner's own headless store works
// internally) that `toast.*` pushes into and `<Toaster />` (mounted once,
// in app/layout.tsx) subscribes to and renders via Snackbar+Alert.
//
// Every real call site across the app already only ever used
// toast.success/toast.error/toast.warning (toast.info/toast.loading were
// only ever used in this component's own demo story, not real app code)
// — kept as the exact same `toast.<method>(message: string)` call shape,
// so every file's own logic is unchanged; only the import path moves
// from "sonner" to here.
//
// One toast shows at a time (the next queued one appears once the
// current one is dismissed) — a deliberate, documented MUI pattern for
// consecutive snackbars, not an attempt to replicate sonner's own
// simultaneous-stack behavior.

export type ToastSeverity = "success" | "error" | "warning" | "info";

type ToastMessage = { id: number; message: string; severity: ToastSeverity };

type ToastListener = (toasts: ToastMessage[]) => void;

let toastQueue: ToastMessage[] = [];
let nextToastId = 1;
const toastListeners = new Set<ToastListener>();

function notifyToastListeners(): void {
  toastListeners.forEach((listener) => listener(toastQueue));
}

function pushToast(severity: ToastSeverity, message: string): void {
  toastQueue = [...toastQueue, { id: nextToastId++, message, severity }];
  notifyToastListeners();
}

function dismissToast(id: number): void {
  toastQueue = toastQueue.filter((item) => item.id !== id);
  notifyToastListeners();
}

function subscribeToToasts(listener: ToastListener): () => void {
  toastListeners.add(listener);
  listener(toastQueue);
  return () => {
    toastListeners.delete(listener);
  };
}

export const toast = {
  success: (message: string) => pushToast("success", message),
  error: (message: string) => pushToast("error", message),
  warning: (message: string) => pushToast("warning", message),
  info: (message: string) => pushToast("info", message),
};

const AUTO_HIDE_DURATION_MS = 4000;

function Toaster() {
  const [queue, setQueue] = useState<ToastMessage[]>([]);

  useEffect(() => subscribeToToasts(setQueue), []);

  const current = queue[0] ?? null;

  return (
    <Snackbar
      open={current !== null}
      autoHideDuration={AUTO_HIDE_DURATION_MS}
      onClose={(_event, reason) => {
        if (reason === "clickaway" || !current) return;
        dismissToast(current.id);
      }}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
    >
      {current ? (
        <Alert onClose={() => dismissToast(current.id)} severity={current.severity} variant="filled" sx={{ width: "100%" }}>
          {current.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
}

export { Toaster };
