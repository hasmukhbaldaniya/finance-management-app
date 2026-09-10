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

export async function apiCall<T>(path: string, options: RequestInit = {}): Promise<T> {
  const result = await window.api.gateway.request(path, {
    method: options.method,
    body: bodyAsString(options.body),
    headers: options.headers as Record<string, string> | undefined,
  });

  if (!result.ok) {
    throw new ApiError(result.message, result.status);
  }
  return result.body as T;
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
