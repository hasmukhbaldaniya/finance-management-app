// reports-service has no database of its own (028-reports.md, following
// docs/PLANS/microservices-frontend-integration-plan.md section 1.1's
// topology) — every report is built by forwarding the caller's own session
// cookie to auth-service's/claim-service's own org-wide read endpoints and
// aggregating the results here. This is the one shared HTTP-fetch helper
// both report handlers use.

export class UpstreamError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
  }
}

// Safety bound on how many pages this service will pull per report request
// before giving up — 028-reports.md's own Open Questions flag that an
// unbounded org-wide pull, aggregated in memory with no DB of its own,
// needs a concrete cap before this goes to a real-sized organization's
// data. 20 pages * 100/page = 2,000 rows per source per report.
const MAX_PAGES = 20;
const PAGE_SIZE = 100;

// No upstream call should be able to hang a report request forever — with no
// retry/circuit-breaker in front of auth-service/claim-service, a slow or
// wedged upstream previously blocked this service's Promise.all fan-out
// indefinitely.
export const UPSTREAM_TIMEOUT_MS = 10_000;

async function fetchJson(url: URL, cookie: string): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(url, { headers: { Cookie: cookie }, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new UpstreamError(504, `${url.hostname} took too long to respond.`);
    }
    throw new UpstreamError(502, `Couldn't reach ${url.hostname} — ${err instanceof Error ? err.message : "connection failed"}.`);
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && typeof (body as { error?: unknown }).error === "string"
      ? (body as { error: string }).error
      : "Something went wrong. Please try again.";
    throw new UpstreamError(response.status, message);
  }
  return (body ?? {}) as Record<string, unknown>;
}

export type PagedResult<T> = {
  items: T[];
  // True when the source still had more rows (`hasMore`) at MAX_PAGES —
  // the report built from `items` is silently incomplete unless callers
  // surface this. See reports.controller.ts's `truncated` response field.
  truncated: boolean;
};

// Pulls every page of a `{ [itemsKey]: T[], hasMore: boolean }`-shaped
// listing endpoint (the exact shape every org-wide endpoint this service
// calls already returns) up to MAX_PAGES, forwarding query params and the
// caller's cookie on each page.
export async function fetchAllPages<T>(
  baseUrl: string,
  path: string,
  itemsKey: string,
  cookie: string,
  params: Record<string, string | undefined> = {}
): Promise<PagedResult<T>> {
  const items: T[] = [];
  let truncated = false;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = new URL(`${baseUrl}${path}`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(PAGE_SIZE));
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
    const body = await fetchJson(url, cookie);
    const pageItems = Array.isArray(body[itemsKey]) ? (body[itemsKey] as T[]) : [];
    items.push(...pageItems);
    if (!body.hasMore) break;
    if (page === MAX_PAGES) truncated = true;
  }
  return { items, truncated };
}
