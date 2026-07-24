// Path routing table — must stay in sync with
// docs/PLANS/microservices-frontend-integration-plan.md section 1.2.
// None of these prefixes should ever change; that's the whole point of the
// gateway (section 2.1) — every src/apis/**/*.api.ts file in the frontend
// keeps calling the exact same relative path it always has.

export const AUTH_SERVICE_PATHS = [
  "/api/auth",
  "/api/grades",
  "/api/departments",
  "/api/roles",
  "/api/associated-organizations",
  "/api/employees",
  "/api/employee-onboarding",
  "/api/projects",
  "/api/airlines",
  "/api/organizations",
];

export const CLAIM_SERVICE_PATHS = [
  "/api/claims",
  "/api/split-requests",
  "/api/categories",
  "/api/trips",
  "/api/countries",
  "/api/cities",
  "/api/expenses",
];

// 028-reports.md's Phase 5 — reports-service, no DB, aggregates over the
// two prefix groups above.
export const REPORTS_SERVICE_PATHS = ["/api/reports"];
