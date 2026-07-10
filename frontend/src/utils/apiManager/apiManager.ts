// Exported so callers that need a raw URL (not a fetch call) — e.g. an
// <img>/<iframe> src for an authenticated file-serving endpoint — can build
// one without duplicating this fallback.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function isErrorBody(value: unknown): value is { error: string } {
  return typeof value === "object" && value !== null && typeof (value as { error?: unknown }).error === "string";
}

export async function apiCall<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(GENERIC_ERROR_MESSAGE, 0);
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = isErrorBody(body) ? body.error : GENERIC_ERROR_MESSAGE;
    throw new ApiError(message, response.status);
  }

  if (body === null) {
    throw new ApiError(GENERIC_ERROR_MESSAGE, response.status);
  }

  return body as T;
}

export function postJson<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  return apiCall<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Multipart upload — no Content-Type header is set so the browser can attach
// its own multipart boundary; everything else (credentials, error shape)
// matches apiCall exactly.
export async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
  } catch {
    throw new ApiError(GENERIC_ERROR_MESSAGE, 0);
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = isErrorBody(body) ? body.error : GENERIC_ERROR_MESSAGE;
    throw new ApiError(message, response.status);
  }

  if (body === null) {
    throw new ApiError(GENERIC_ERROR_MESSAGE, response.status);
  }

  return body as T;
}

// For endpoints that return a binary file (the bulk-invite template/error
// report) rather than JSON — success responses are read as a Blob; failure
// responses still follow the usual { error } JSON shape.
export async function downloadFile(path: string): Promise<Blob> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, { credentials: "include" });
  } catch {
    throw new ApiError(GENERIC_ERROR_MESSAGE, 0);
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message = isErrorBody(body) ? body.error : GENERIC_ERROR_MESSAGE;
    throw new ApiError(message, response.status);
  }

  return response.blob();
}
