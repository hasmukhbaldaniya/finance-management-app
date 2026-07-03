const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

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
