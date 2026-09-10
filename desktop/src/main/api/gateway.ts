import { session } from "electron";

/**
 * All gateway HTTP calls happen here, in main — never in the renderer.
 * See the plan's "Scope expansion" / decision 3: gateway-service's CORS is a
 * single literal allowed origin with credentials:true, which a `file://` or
 * dev-Vite-origin renderer can never satisfy without editing gateway-service
 * itself. Main-process requests aren't subject to CORS at all, and this
 * session partition gives cookies a real, persistent jar (Chromium's own,
 * encrypted via the OS keychain on macOS) — unlike Node's global `fetch`
 * (undici), which doesn't touch Electron's cookie store.
 *
 * Electron's `net.fetch()` always uses the *default* session — reaching a
 * named, persistent session requires calling that Session object's own
 * `.fetch()` instead (`session.fromPartition(...).fetch(...)`), which is
 * what every call below does.
 */
const GATEWAY_SESSION_PARTITION = "persist:finance";

function requireApiBaseUrl(): string {
  // import.meta.env.VITE_API_BASE_URL is available here too: electron-vite
  // injects any `VITE_`-prefixed .env var into all three build targets
  // (main, preload, renderer), not just the renderer.
  const value = import.meta.env["VITE_API_BASE_URL"] as string | undefined;
  return value && value.length > 0 ? value : "http://localhost:4400/api";
}

const API_BASE_URL = requireApiBaseUrl();
const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

function gatewaySession(): Electron.Session {
  return session.fromPartition(GATEWAY_SESSION_PARTITION);
}

function extractErrorMessage(body: unknown): string {
  if (typeof body === "object" && body !== null && typeof (body as { error?: unknown }).error === "string") {
    return (body as { error: string }).error;
  }
  return GENERIC_ERROR_MESSAGE;
}

export type GatewayJsonResult =
  | { ok: true; status: number; body: unknown }
  | { ok: false; status: number; message: string };

export type GatewayDownloadResult =
  | { ok: true; status: number; data: ArrayBuffer; contentType: string }
  | { ok: false; status: number; message: string };

export type GatewayRequestOptions = {
  method?: string;
  /** Already JSON.stringify()'d by the caller (mirrors the ported apiManager.ts's own contract), or undefined for a bodyless request. */
  body?: string;
  headers?: Record<string, string>;
};

export type GatewayUploadEntry =
  | { kind: "field"; name: string; value: string }
  | { kind: "file"; name: string; fileName: string; mimeType: string; data: ArrayBuffer };

/** Plain JSON request/response — the transport behind apiCall/postJson. */
export async function gatewayRequest(path: string, options: GatewayRequestOptions = {}): Promise<GatewayJsonResult> {
  let response: Response;
  try {
    response = await gatewaySession().fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      body: options.body,
    });
  } catch {
    return { ok: false, status: 0, message: GENERIC_ERROR_MESSAGE };
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    return { ok: false, status: response.status, message: extractErrorMessage(body) };
  }
  if (body === null) {
    return { ok: false, status: response.status, message: GENERIC_ERROR_MESSAGE };
  }
  return { ok: true, status: response.status, body };
}

/** Multipart upload — the transport behind apiManager.ts's uploadFile. */
export async function gatewayUpload(path: string, entries: GatewayUploadEntry[]): Promise<GatewayJsonResult> {
  const formData = new FormData();
  for (const entry of entries) {
    if (entry.kind === "file") {
      formData.append(entry.name, new Blob([entry.data], { type: entry.mimeType }), entry.fileName);
    } else {
      formData.append(entry.name, entry.value);
    }
  }

  let response: Response;
  try {
    // No Content-Type header, deliberately — matches apiManager.ts's original
    // uploadFile exactly: the fetch implementation attaches its own
    // multipart boundary when the body is a FormData instance.
    response = await gatewaySession().fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
  } catch {
    return { ok: false, status: 0, message: GENERIC_ERROR_MESSAGE };
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    return { ok: false, status: response.status, message: extractErrorMessage(body) };
  }
  if (body === null) {
    return { ok: false, status: response.status, message: GENERIC_ERROR_MESSAGE };
  }
  return { ok: true, status: response.status, body };
}

/** Binary download — the transport behind apiManager.ts's downloadFile. */
export async function gatewayDownload(path: string): Promise<GatewayDownloadResult> {
  let response: Response;
  try {
    response = await gatewaySession().fetch(`${API_BASE_URL}${path}`, {
      credentials: "include",
    });
  } catch {
    return { ok: false, status: 0, message: GENERIC_ERROR_MESSAGE };
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    return { ok: false, status: response.status, message: extractErrorMessage(body) };
  }

  const data = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") ?? "application/octet-stream";
  return { ok: true, status: response.status, data, contentType };
}
