import { env } from "../config/env";

// A thin HTTP client for auth-service's one internal read this backend
// (soon to be claim-service) still needs — real employee names/emails for
// display, now that Employee itself lives in auth-service's own database.
// Mirrors ai-extraction.service.ts's/communications.service.ts's own shape.
// Everything else these call sites used to get from a local Employee query
// (organizationId, for scoping) now comes from the caller's own JWT claim
// instead — see middleware/require-auth.ts.

export type EmployeeLookupResult = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  organizationId: number;
};

let cachedAirlineIds: Set<number> | null = null;

// Cached indefinitely per-process — Airline is fixed, seeded, global,
// non-org-scoped catalog data with no management UI (see
// backend/CLAUDE.md's Employee Invitation section), so nothing can change
// it at runtime; there's no reason to pay a network round trip to
// auth-service on every single claim save just to re-fetch the same list.
export async function getValidAirlineIds(): Promise<Set<number>> {
  if (cachedAirlineIds) return cachedAirlineIds;

  let response: Response;
  try {
    response = await fetch(`${env.authService.url}/api/internal/airlines`, {
      headers: env.authService.internalApiKey ? { "X-Internal-Api-Key": env.authService.internalApiKey } : {},
    });
  } catch (err) {
    throw new Error(`Couldn't reach auth-service — ${err instanceof Error ? err.message : "connection failed"}.`);
  }

  if (!response.ok) {
    throw new Error("auth-service airline lookup failed.");
  }

  const body = (await response.json()) as { airlines: { id: number }[] };
  cachedAirlineIds = new Set(body.airlines.map((airline) => airline.id));
  return cachedAirlineIds;
}

export async function lookupEmployees(ids: number[]): Promise<EmployeeLookupResult[]> {
  if (ids.length === 0) return [];

  let response: Response;
  try {
    response = await fetch(`${env.authService.url}/api/internal/employees/lookup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.authService.internalApiKey ? { "X-Internal-Api-Key": env.authService.internalApiKey } : {}),
      },
      body: JSON.stringify({ ids }),
    });
  } catch (err) {
    throw new Error(`Couldn't reach auth-service — ${err instanceof Error ? err.message : "connection failed"}.`);
  }

  if (!response.ok) {
    throw new Error("auth-service employee lookup failed.");
  }

  const body = (await response.json()) as { employees: EmployeeLookupResult[] };
  return body.employees;
}
