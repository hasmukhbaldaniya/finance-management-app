import { env } from "../config/env";
import { fetchAllPages, UpstreamError, UPSTREAM_TIMEOUT_MS } from "./upstream-client";

export type EmployeeSummary = {
  id: number;
  firstName: string;
  lastName: string;
  department: string | null;
};

export type EmployeeLookup = {
  byId: Map<number, EmployeeSummary>;
  truncated: boolean;
};

// auth-service's GET /employees excludes the caller's own record (it's
// built for the Employee Listing page, "everyone but me" — see
// employee.controller.ts's own comment), which would silently drop the
// caller's own expenses/trips from a department breakdown. Fetched
// separately via GET /employees/me and merged in here so every report
// caller sees their own records too, not just everyone else's.
export async function fetchAllEmployees(cookie: string): Promise<EmployeeLookup> {
  const [others, me] = await Promise.all([
    fetchAllPages<EmployeeSummary>(env.authServiceUrl, "/api/employees", "employees", cookie),
    fetch(new URL("/api/employees/me", env.authServiceUrl), {
      headers: { Cookie: cookie },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    }).then(async (response) => {
      if (!response.ok) throw new UpstreamError(response.status, "Couldn't load the caller's own profile.");
      const body = (await response.json()) as { employee?: EmployeeSummary };
      return body.employee ?? null;
    }),
  ]);

  const byId = new Map(others.items.map((employee) => [employee.id, employee]));
  if (me) byId.set(me.id, me);
  return { byId, truncated: others.truncated };
}
