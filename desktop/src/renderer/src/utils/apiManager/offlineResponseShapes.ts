// The one genuinely domain-aware piece of the offline-first design — every
// other part (cache, queue, ID remap) is fully generic. A blanket "echo the
// request body back" is NOT safe: e.g. createDepartment's real response is
// `{department: {...}}`, not a bare object, and claim/saveExpenses returns a
// server-computed money total no client guess should ever fabricate. Every
// rule below was written against this app's actual `*.api.ts`/`*.type.ts`
// source, not guessed — see the plan's "optimistic-response problem" section.
//
// Three buckets:
//  - "A": derive a response that's actually correct — either directly from
//    the submitted body (when the response only echoes what was sent), or
//    from the last cached detail merged with the body (when the response
//    carries fields the request itself doesn't, e.g. a trip's `totalAmount`).
//  - "B": the response only ever drives a toast — synthesize `{message}`.
//  - "C": a wrong guess here would be actively misleading (money, server-side
//    file/AI processing, live OTP round trips) — excluded from offline
//    queuing entirely; attempting one offline throws a clear, distinguishable
//    error instead of silently queuing a fabricated result.
//
// Unmatched paths default to "C" — never fall through to a guess.

export type OfflineWriteContext = {
  path: string;
  /** The dynamic id segment captured from `path` by this rule's pattern, if any. */
  id?: number;
  body: Record<string, unknown>;
  /** Set only when this write is being queued as a "create" (see apiManager.ts). */
  localId?: number;
  /**
   * The cached GET response at this exact same path, if any — every rule
   * below that needs it targets a domain whose detail-read endpoint uses
   * the identical path as the write itself (trips, claims), so a plain
   * same-path lookup (resolved once, up front, in apiManager.ts) is enough;
   * no rule needs to look up a *different* path.
   */
  cached: unknown;
};

export type OfflineWriteRule =
  | {
      bucket: "A";
      isCreate: boolean;
      buildResponse: (ctx: OfflineWriteContext) => unknown;
      /**
       * Only for `isCreate` rules whose domain has a real detail-read screen
       * (Trips, Claims, Employees, Categories) — without this, navigating
       * straight to the newly (offline-)created entity's detail page is a
       * cache miss and shows an error, even though the create itself
       * "succeeded". Returns the cache key + value to seed, shaped exactly
       * like that domain's real GET-detail response (a different wrapper
       * than the create response itself for every one of these domains).
       */
      seedDetailCache?: (ctx: OfflineWriteContext, response: unknown) => { path: string; data: unknown };
    }
  | { bucket: "B" }
  | { bucket: "C" };

type ShapeTableEntry = { method: string; pattern: RegExp; rule: OfflineWriteRule };

function messageOnly(): OfflineWriteRule {
  return { bucket: "B" };
}

function excluded(): OfflineWriteRule {
  return { bucket: "C" };
}

/** department/grade share an identical shape — role is written out separately (it also carries privileges/isDefault). */
function membershipCrudRules(collection: string, wrapperKey: string): ShapeTableEntry[] {
  const idPattern = new RegExp(`^/${collection}/(-?\\d+)$`);
  const statusPattern = new RegExp(`^/${collection}/(-?\\d+)/status$`);
  return [
    {
      method: "POST",
      pattern: new RegExp(`^/${collection}$`),
      rule: {
        bucket: "A",
        isCreate: true,
        buildResponse: (ctx) => ({
          [wrapperKey]: { id: ctx.localId, name: ctx.body["name"], isActive: true, membersCount: 0 },
        }),
      },
    },
    {
      method: "PUT",
      pattern: idPattern,
      rule: {
        bucket: "A",
        isCreate: false,
        // isActive/membersCount are best-effort defaults — this endpoint's
        // body only ever carries `name`. Corrected the moment sync refetches.
        buildResponse: (ctx) => ({
          [wrapperKey]: { id: ctx.id, name: ctx.body["name"], isActive: true, membersCount: 0 },
        }),
      },
    },
    { method: "DELETE", pattern: idPattern, rule: messageOnly() },
    {
      method: "PATCH",
      pattern: statusPattern,
      rule: {
        bucket: "A",
        isCreate: false,
        // isActive here is exact — it's literally the field being submitted.
        buildResponse: (ctx) => ({
          [wrapperKey]: { id: ctx.id, name: "", isActive: ctx.body["isActive"], membersCount: 0 },
        }),
      },
    },
  ];
}

const TABLE: ShapeTableEntry[] = [
  // ---- Trips ----
  {
    method: "POST",
    pattern: /^\/trips$/,
    rule: {
      bucket: "A",
      isCreate: true,
      // Real response is exactly {id,status,totalAmount} — a brand-new trip
      // always starts "new" with nothing spent yet.
      buildResponse: (ctx) => ({ id: ctx.localId, status: "new", totalAmount: "0.00" }),
      // Without this, navigating straight to the new trip's detail page
      // (the obvious next step after creating one) is a cache miss and
      // shows an error even though the create itself "succeeded". City
      // names are placeholders — the create body only carries city *ids* —
      // corrected the moment sync refetches the real detail.
      seedDetailCache: (ctx, response) => {
        const created = response as { status: string; totalAmount: string };
        return {
          path: `/trips/${ctx.localId}`,
          data: {
            trip: {
              id: ctx.localId,
              name: ctx.body["name"],
              status: created.status,
              createdAt: new Date().toISOString(),
              startAt: ctx.body["startAt"],
              endAt: ctx.body["endAt"],
              startCity: { id: ctx.body["startCityId"], countryId: null, name: "", countryName: "", countryCode: "" },
              endCity: { id: ctx.body["endCityId"], countryId: null, name: "", countryName: "", countryCode: "" },
              totalAmount: created.totalAmount,
              approvedAmount: null,
            },
            expenses: [],
          },
        };
      },
    },
  },
  {
    method: "PATCH",
    pattern: /^\/trips\/(-?\d+)$/,
    rule: {
      bucket: "A",
      isCreate: false,
      // The update body never carries status/totalAmount — pull them from
      // the cached detail (GET and PATCH share this exact path).
      buildResponse: (ctx) => {
        const cached = ctx.cached as { trip?: { status?: string; totalAmount?: string } } | null;
        return {
          id: ctx.id,
          status: cached?.trip?.status ?? "new",
          totalAmount: cached?.trip?.totalAmount ?? "0.00",
        };
      },
    },
  },
  { method: "DELETE", pattern: /^\/trips\/(-?\d+)$/, rule: messageOnly() },

  // ---- Claims ----
  {
    method: "POST",
    pattern: /^\/claims$/,
    rule: {
      bucket: "A",
      isCreate: true,
      buildResponse: (ctx) => ({ id: ctx.localId, status: ctx.body["isDraftSave"] ? "draft" : "submitted" }),
      seedDetailCache: (ctx, response) => {
        const created = response as { status: string };
        return {
          path: `/claims/${ctx.localId}`,
          data: {
            claim: {
              id: ctx.localId,
              name: ctx.body["name"] ?? null,
              tripName: null,
              claimType: ctx.body["claimType"],
              tripId: ctx.body["tripId"] ?? null,
              creationMethod: ctx.body["creationMethod"] ?? "manual",
              status: created.status,
              totalAmount: "0.00",
              splitFromClaimId: null,
              createdAt: new Date().toISOString(),
              expenses: [],
            },
          },
        };
      },
    },
  },
  {
    method: "PATCH",
    pattern: /^\/claims\/(-?\d+)$/,
    rule: {
      bucket: "A",
      isCreate: false,
      buildResponse: (ctx) => ({ id: ctx.id, status: ctx.body["isDraftSave"] ? "draft" : "submitted" }),
    },
  },
  { method: "DELETE", pattern: /^\/claims\/(-?\d+)$/, rule: messageOnly() },
  { method: "DELETE", pattern: /^\/claims\/(-?\d+)\/invoice-files\/(-?\d+)$/, rule: messageOnly() },
  // Server-computed money total, server-side file/AI processing, or a live
  // round trip — a wrong guess here is worse than an error. See plan.
  { method: "PUT", pattern: /^\/claims\/(-?\d+)\/expenses$/, rule: excluded() },
  { method: "POST", pattern: /^\/claims\/(-?\d+)\/invoice-files\/(-?\d+)\/merge$/, rule: excluded() },
  { method: "POST", pattern: /^\/claims\/(-?\d+)\/expenses\/(-?\d+)\/unmerge$/, rule: excluded() },
  { method: "POST", pattern: /^\/claims\/(-?\d+)\/process$/, rule: excluded() },
  { method: "POST", pattern: /^\/claims\/(-?\d+)\/split$/, rule: excluded() },
  { method: "POST", pattern: /^\/claims\/(-?\d+)\/expenses\/(-?\d+)\/split$/, rule: excluded() },

  // ---- Categories ----
  {
    method: "POST",
    pattern: /^\/categories$/,
    rule: {
      bucket: "A",
      isCreate: true,
      buildResponse: (ctx) => ({ id: ctx.localId, status: ctx.body["isDraftSave"] ? "draft" : "active" }),
    },
  },
  { method: "PATCH", pattern: /^\/categories\/(-?\d+)$/, rule: messageOnly() }, // updateBasicDetails
  { method: "DELETE", pattern: /^\/categories\/(-?\d+)$/, rule: messageOnly() },
  {
    method: "PATCH",
    pattern: /^\/categories\/(-?\d+)\/status$/,
    rule: {
      bucket: "A",
      isCreate: false,
      // Exact — isEnabled is literally the field being submitted.
      buildResponse: (ctx) => ({ category: { id: ctx.id, isEnabled: ctx.body["isEnabled"] } }),
    },
  },
  { method: "PUT", pattern: /^\/categories\/(-?\d+)\/fields$/, rule: messageOnly() },
  { method: "PUT", pattern: /^\/categories\/(-?\d+)\/policies$/, rule: messageOnly() },
  // Response also carries `status`, whose derivation here wasn't confirmed
  // against the backend — safer to require a connection than guess wrong.
  { method: "PUT", pattern: /^\/categories\/(-?\d+)\/project-policies$/, rule: excluded() },
  { method: "POST", pattern: /^\/categories\/(-?\d+)\/finish-editing$/, rule: excluded() },

  // ---- Department / Grade (identical shape) ----
  ...membershipCrudRules("departments", "department"),
  ...membershipCrudRules("grades", "grade"),

  // ---- Role (department/grade shape + privileges/isDefault) ----
  {
    method: "POST",
    pattern: /^\/roles$/,
    rule: {
      bucket: "A",
      isCreate: true,
      buildResponse: (ctx) => ({
        role: {
          id: ctx.localId,
          name: ctx.body["name"],
          isDefault: false,
          isActive: true,
          privileges: ctx.body["privileges"] ?? [],
          membersCount: 0,
        },
      }),
    },
  },
  {
    method: "PUT",
    pattern: /^\/roles\/(-?\d+)$/,
    rule: {
      bucket: "A",
      isCreate: false,
      buildResponse: (ctx) => ({
        role: {
          id: ctx.id,
          name: ctx.body["name"],
          isDefault: false,
          isActive: true,
          privileges: ctx.body["privileges"] ?? [],
          membersCount: 0,
        },
      }),
    },
  },
  { method: "DELETE", pattern: /^\/roles\/(-?\d+)$/, rule: messageOnly() },
  {
    method: "PATCH",
    pattern: /^\/roles\/(-?\d+)\/status$/,
    rule: {
      bucket: "A",
      isCreate: false,
      buildResponse: (ctx) => ({
        role: { id: ctx.id, name: "", isDefault: false, isActive: ctx.body["isActive"], privileges: [], membersCount: 0 },
      }),
    },
  },

  // ---- Associated Organizations (status toggle only) ----
  {
    method: "PATCH",
    pattern: /^\/associated-organizations\/(-?\d+)\/status$/,
    rule: {
      bucket: "A",
      isCreate: false,
      // Exact — the real response is precisely {id,isActive}.
      buildResponse: (ctx) => ({ associatedOrganization: { id: ctx.id, isActive: ctx.body["isActive"] } }),
    },
  },

  // ---- Projects (create only) ----
  {
    method: "POST",
    pattern: /^\/projects$/,
    rule: {
      bucket: "A",
      isCreate: true,
      // Exact — name/departmentId are both submitted; isActive:true is safe
      // for a project that doesn't exist on the server yet.
      buildResponse: (ctx) => ({
        project: { id: ctx.localId, name: ctx.body["name"], departmentId: ctx.body["departmentId"], isActive: true },
      }),
    },
  },

  // ---- Employees ----
  {
    method: "POST",
    pattern: /^\/employees$/,
    rule: { bucket: "A", isCreate: true, buildResponse: (ctx) => ({ id: ctx.localId }) }, // real response is just {id}
  },
  {
    method: "PATCH",
    pattern: /^\/employees\/(-?\d+)$/,
    rule: {
      bucket: "A",
      isCreate: false,
      // Exact — EmployeeBasicInfo's fields are precisely the payload's fields.
      buildResponse: (ctx) => ({ employee: { id: ctx.id, ...ctx.body } }),
    },
  },
  {
    method: "PATCH",
    pattern: /^\/employees\/(-?\d+)\/status$/,
    rule: {
      bucket: "A",
      isCreate: false,
      buildResponse: (ctx) => ({ employee: { id: ctx.id, status: ctx.body["status"] } }),
    },
  },
  { method: "PUT", pattern: /^\/employees\/(-?\d+)\/company-access$/, rule: messageOnly() },
  { method: "PATCH", pattern: /^\/employees\/me$/, rule: messageOnly() },
  { method: "POST", pattern: /^\/employees\/(-?\d+)\/approvals$/, rule: messageOnly() },
  { method: "POST", pattern: /^\/employees\/(-?\d+)\/ff-numbers$/, rule: messageOnly() },
  // Covers both resend.api.ts and sendInvite.api.ts — same method+path.
  { method: "POST", pattern: /^\/employees\/(-?\d+)\/invitations$/, rule: messageOnly() },
  // OTP/live-round-trip-only, same class as auth — see the prefix check below.
  { method: "PUT", pattern: /^\/employees\/me\/mobile$/, rule: excluded() },
  { method: "POST", pattern: /^\/employees\/me\/mobile-otp$/, rule: excluded() },
  { method: "POST", pattern: /^\/employees\/me\/mobile-otp\/verify$/, rule: excluded() },
  { method: "POST", pattern: /^\/employees\/bulk\/import$/, rule: excluded() },

  // ---- Split requests ----
  {
    method: "POST",
    pattern: /^\/claims\/(-?\d+)\/expenses\/(-?\d+)\/split-requests$/,
    rule: { bucket: "A", isCreate: true, buildResponse: (ctx) => ({ id: ctx.localId }) },
  },
  { method: "POST", pattern: /^\/split-requests\/(-?\d+)\/reject$/, rule: messageOnly() },
  // Fabricates a brand-new claim + amounts — excluded, same reasoning as
  // claim.saveExpenses.
  { method: "POST", pattern: /^\/split-requests\/(-?\d+)\/accept$/, rule: excluded() },
];

/**
 * Resolves the offline rule for a write. `auth/*` and `employee-onboarding/*`
 * are session/security flows that can't happen offline by nature (can't
 * receive an OTP with no connection) — excluded outright rather than listed
 * endpoint-by-endpoint. Anything not explicitly matched also defaults to
 * excluded: never fall through to a guessed shape for an endpoint this table
 * doesn't know about.
 */
export function resolveOfflineWriteRule(method: string, path: string): OfflineWriteRule {
  if (path.startsWith("/auth/") || path.startsWith("/employee-onboarding/")) {
    return excluded();
  }
  const entry = TABLE.find((candidate) => candidate.method === method && candidate.pattern.test(path));
  return entry?.rule ?? excluded();
}

/** Extracts the single dynamic id segment captured by a matched rule's pattern, if any. */
export function extractPathId(method: string, path: string): number | undefined {
  const entry = TABLE.find((candidate) => candidate.method === method && candidate.pattern.test(path));
  if (!entry) return undefined;
  const match = entry.pattern.exec(path);
  const captured = match?.[1];
  return captured !== undefined ? Number(captured) : undefined;
}
