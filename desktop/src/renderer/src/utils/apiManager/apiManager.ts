// Ported from frontend/src/utils/apiManager/apiManager.ts. Every exported
// name and signature here is unchanged — every one of the ~100 ported
// apis/**/*.api.ts files calls these exact functions the same way they
// always did. Only the transport changes: instead of calling `fetch(...)`
// directly, each primitive calls through `window.api.gateway.*` (see
// src/preload/index.ts), which forwards to src/main/api/gateway.ts — the
// process that actually holds gateway-service's session cookies. See the
// plan's "gateway bridge" section for why this main-process detour exists
// (gateway-service's CORS is a single literal allowed origin, which no
// Electron renderer origin — file:// or a dev Vite port — can ever satisfy).
//
// apiCall is also the one place offline fallback lives (see the plan's
// "The attempt real first pattern" and "The optimistic-response problem"):
// every read and JSON write in the app funnels through it, so this is the
// only file that needs to know about the local DB at all — none of the
// ~100 endpoint files change.

import { extractPathId, resolveOfflineWriteRule, type OfflineWriteContext } from "./offlineResponseShapes";
import { OFFLINE_PENDING_CHANGED_EVENT } from "@/utils/constants/offline.constant";

export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function bodyAsString(body: RequestInit["body"]): string | undefined {
  // Every real caller in this codebase already passes a JSON.stringify()'d
  // string (postJson does it below; the handful of direct-apiCall PUT/PATCH
  // callers do it themselves) or omits body entirely — never a Blob/
  // ArrayBuffer/URLSearchParams/ReadableStream. Guard rather than assume, so
  // a future caller that breaks this contract fails loudly instead of
  // silently sending "[object Object]".
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string") return body;
  throw new TypeError("apiCall only supports a string (JSON) body");
}

// A locally-created entity's id (see native/src/lib.rs's nextLocalId) is a
// negative integer embedded in the path just like a real id would be, e.g.
// `/trips/-3`. A real server would correctly 404 an id it never issued —
// that's a genuine HTTP error, not the status:0 network-down signal below —
// so any path containing one is routed to local handling unconditionally,
// online or not.
const NEGATIVE_ID_SEGMENT = /(^|\/)-\d+(\/|$)/;

function hasNegativeIdSegment(path: string): boolean {
  return NEGATIVE_ID_SEGMENT.test(path);
}

/** Every failed write ends up here as a plain toast message via ApiError. */
const OFFLINE_UNSUPPORTED_MESSAGE = "This action requires an internet connection.";

async function handleOfflineRead<T>(path: string): Promise<T> {
  const cached = await window.api.offline.cacheGet(path);
  if (cached === null) {
    // No prior successful fetch to fall back to — a real, honest failure,
    // not a fabricated empty result.
    throw new ApiError(GENERIC_ERROR_MESSAGE, 0);
  }
  return JSON.parse(cached) as T;
}

async function handleOfflineWrite<T>(method: string, path: string, body: string | undefined): Promise<T> {
  const rule = resolveOfflineWriteRule(method, path);

  if (rule.bucket === "C") {
    throw new ApiError(OFFLINE_UNSUPPORTED_MESSAGE, 0);
  }

  const parsedBody = (body ? JSON.parse(body) : {}) as Record<string, unknown>;
  const localId = rule.bucket === "A" && rule.isCreate ? await window.api.offline.nextLocalId() : undefined;

  await window.api.offline.enqueue(method, path, body, localId);
  window.dispatchEvent(new Event(OFFLINE_PENDING_CHANGED_EVENT));

  if (rule.bucket === "B") {
    return { message: "Queued — will sync when back online." } as T;
  }

  const cachedRaw = await window.api.offline.cacheGet(path);
  const ctx: OfflineWriteContext = {
    path,
    id: extractPathId(method, path),
    body: parsedBody,
    localId,
    cached: cachedRaw !== null ? JSON.parse(cachedRaw) : null,
  };
  const response = rule.buildResponse(ctx);

  if (rule.isCreate && rule.seedDetailCache) {
    const seed = rule.seedDetailCache(ctx, response);
    void window.api.offline.cachePut(seed.path, seed.path, JSON.stringify(seed.data));
  }

  return response as T;
}

export async function apiCall<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const body = bodyAsString(options.body);

  if (hasNegativeIdSegment(path)) {
    return method === "GET" ? handleOfflineRead<T>(path) : handleOfflineWrite<T>(method, path, body);
  }

  const result = await window.api.gateway.request(path, {
    method: options.method,
    body,
    headers: options.headers as Record<string, string> | undefined,
  });

  if (result.ok) {
    if (method === "GET") {
      // Write-through cache: every successful read stays available offline
      // afterward — this is also what lets SessionContext's getMe() resolve
      // from cache instead of throwing when the app launches offline for a
      // previously-logged-in user (see the plan's "Session bootstrap" note).
      void window.api.offline.cachePut(path, path, JSON.stringify(result.body));
    }
    return result.body as T;
  }

  if (result.status !== 0) {
    // A real HTTP error from the server — never reinterpreted as offline.
    throw new ApiError(result.message, result.status);
  }

  return method === "GET" ? handleOfflineRead<T>(path) : handleOfflineWrite<T>(method, path, body);
}

export function postJson<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  return apiCall<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Multipart upload — matches the original's contract exactly: takes a
// FormData built by the caller (e.g. claim/uploadInvoiceFiles.api.ts appends
// several files under the same field name), converts each entry into a
// wire-safe shape (files become ArrayBuffer + filename + MIME type, since
// FormData/File can't cross the IPC structured-clone boundary), and lets
// src/main/api/gateway.ts rebuild the real multipart FormData on that side.
export async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  const entries = await Promise.all(
    Array.from(formData.entries()).map(async ([name, value]) => {
      if (value instanceof File) {
        return {
          kind: "file" as const,
          name,
          fileName: value.name,
          mimeType: value.type || "application/octet-stream",
          data: await value.arrayBuffer(),
        };
      }
      return { kind: "field" as const, name, value };
    }),
  );

  const result = await window.api.gateway.upload(path, entries);

  if (!result.ok) {
    throw new ApiError(result.message, result.status);
  }
  return result.body as T;
}

// For endpoints that return a binary file (the bulk-invite template/error
// report, an invoice file's content) rather than JSON.
export async function downloadFile(path: string): Promise<Blob> {
  const result = await window.api.gateway.download(path);

  if (!result.ok) {
    throw new ApiError(result.message, result.status);
  }
  return new Blob([result.data], { type: result.contentType });
}
