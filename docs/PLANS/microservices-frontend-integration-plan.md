# Microservices Runtime Integration & Frontend Changes

Status: `auth-service` and `claim-service` (the renamed original `backend/`) are both real, running
services, and the gateway this doc centers on is **now built** as `gateway-service/` — see
"Completion notes" at the end of this document for what actually shipped versus what changed from
the plan below. Everywhere `backend` is named as the thing that "does X today," read that as
historical framing for why the gateway/JWT design was chosen, not a claim about the current
`claim-service` codebase (which no longer has the auth code being described). Companion to
`docs/PLANS/microservices-plan.md` (service boundaries, database choices, extraction order).

## 1. Runtime architecture

### 1.0 What the API Gateway actually is

An API Gateway is a single service that sits in front of the other backend services and is the
**only** one the browser ever talks to. It reads each incoming request (usually by URL path) and
forwards it to whichever backend service actually owns that endpoint, then passes the response
straight back — the browser never knows or cares that four separate processes are involved.

**Why this plan needs one, concretely:** today `backend/src/app.ts` is one Express app that mounts
one `apiRouter` handling everything under `/api/*` (`app.ts:20`). Once auth-service/claim-service/
communications-service/reports-service are split apart, there's no longer one process listening on
`/api/*` — the gateway re-creates that same "one front door" illusion for the frontend. It's the
direct functional replacement for what `app.ts` does today, except each route now forwards to a
different service over the network instead of an in-process controller.

**What it does, mechanically:**
- Reads the request path (`/api/employees/...`, `/api/claims/...`, etc.) and forwards it to the
  right service — the routing table is section 1.2 below.
- Forwards request/response bodies, headers, and cookies through unchanged — this is what keeps the
  JWT session cookie working across all 4 services despite them being separate processes (see
  section 1.3).
- Centralizes things that would otherwise be duplicated identically in every service: CORS
  (`cors({ origin, credentials: true })`, currently in `app.ts`), TLS termination, request logging
  (`morgan`), rate limiting.

**What it deliberately does *not* do:** verify JWTs or contain any business logic — each service
verifies the JWT itself, statelessly (section 1.3). It's a thin routing layer, not a smart one.

**Implementation options**, simplest to most involved:
1. **A small Express app using `http-proxy-middleware`** — a few lines of routing-by-path-prefix,
   same language/stack as every other service here, runs as one more entry in
   `docker-compose.yml`. Recommended starting point given this repo's existing bias toward not
   reaching for new infrastructure before it's needed.
2. **Nginx as a reverse proxy** — `location` blocks doing the same routing, zero application code,
   battle-tested, common in docker-compose setups.
3. **A managed/dedicated gateway** (Kong, Traefik, AWS API Gateway) — real extra features (auth
   plugins, rate limiting, observability) but real operational overhead and a new tool to learn;
   overkill until there's an actual deployment/scale reason for it.

### 1.1 Topology

```
Browser
  |
  |  single origin (https://api.<yourapp> or a local gateway port)
  v
API Gateway  ──────────────────────────────────────────────
  |  /api/auth/*, /api/grades*, /api/departments*, /api/roles*,
  |  /api/associated-organizations*, /api/employees*,
  |  /api/employee-onboarding*, /api/employees/bulk*,
  |  /api/projects*, /api/airlines*, /api/organizations*
  ├────────────────────────────────────────►  auth-service (Postgres)
  |
  |  /api/claims*, /api/categories*, /api/trips*,
  |  /api/countries*, /api/cities*, /api/split-requests*
  ├────────────────────────────────────────►  claim-service (Postgres)
  |
  |  /api/reports* (future)
  └────────────────────────────────────────►  reports-service (no DB)

Internal-only, never reached directly by the browser:
  claim-service ──HTTP──► ai-service           (already exists, unchanged contract; ai-service now
                                                 owns its own MySQL DB for AiExtractionLog — see
                                                 microservices-plan.md — invisible from here)
  claim-service ──HTTP──► communications-service (split-request emails)
  auth-service  ──HTTP──► communications-service (OTP / invite emails)
  reports-service ──HTTP──► auth-service, claim-service (read-only, on demand)
```

**ai-service gaining its own MySQL database (see `microservices-plan.md`) requires zero frontend
changes** — ai-service was already internal-only, never in the gateway's routing table, never called
by the browser. The one behavior change worth knowing about even though it's invisible here: the
frontend's existing AI-processing-pipeline polling (`GET /claims/:id/process-status`, still served
by claim-service through the gateway exactly as today) now depends on claim-service completing an
internal read against ai-service's own status endpoint, rather than a local DB query — same response
shape, slightly different internal latency profile.

The gateway is the one new piece of infrastructure this whole plan hinges on for the frontend
staying simple. Everything in section 2 below follows from it.

### 1.2 Path routing table (what the gateway must reproduce exactly)

| Path prefix (unchanged from today) | Routed to |
|---|---|
| `/api/auth/*` | auth-service |
| `/api/grades*`, `/api/departments*`, `/api/roles*` | auth-service |
| `/api/associated-organizations*` | auth-service |
| `/api/employees*`, `/api/employee-onboarding*`, `/api/employees/bulk*` | auth-service |
| `/api/projects*`, `/api/airlines*`, `/api/organizations*` | auth-service |
| `/api/claims*`, `/api/split-requests*` | claim-service |
| `/api/categories*` | claim-service |
| `/api/trips*`, `/api/countries*`, `/api/cities*` | claim-service |
| `/api/reports*` | reports-service (once built) |

None of these paths change — the gateway routes by the same prefixes the frontend already calls
today. This is deliberate: see section 2.1 for why that's the whole point.

### 1.3 Auth / session flow

**Why cookies (not `localStorage` + an `Authorization` header)** — this isn't a new choice this
plan introduces; `backend`/`frontend` already do this today, but it's worth explaining why, since
the whole gateway design in 1.1 exists partly to keep it working across 4 services instead of 1:

- **XSS protection.** An httpOnly cookie can't be read by JavaScript running in the page —
  `document.cookie` simply doesn't see it. If the frontend ever has an XSS bug, the injected script
  still can't steal the token and replay it elsewhere. A JWT sitting in `localStorage` has no such
  protection — any XSS bug there becomes a full session-theft bug. `backend/src/utils/auth.ts`'s
  `accessTokenCookieOptions()` is what sets this flag today.
- **Zero manual wiring per request.** The browser attaches the cookie to every request to that
  origin automatically — that's why `apiManager.ts` only needs `credentials: "include"` on its
  `fetch` calls, not code to read a token from storage and manually set an `Authorization: Bearer
  ...` header on every API call.
- **The server controls expiry** — `Max-Age`/`Expires` are set server-side when the cookie is
  issued; the browser discards it on its own once expired.
- **Why it matters for the gateway specifically:** cookies are scoped by domain. Because the
  browser only ever talks to the gateway's single origin (1.1), the cookie auth-service sets gets
  sent back on every subsequent request to the gateway automatically, regardless of which of the 4
  services ends up handling it. That's exactly why the single-origin gateway design was chosen — it
  lets the existing cookie-based session keep working unmodified across a now-multi-service
  backend, instead of redesigning auth around a Bearer token the frontend would have to manually
  store and attach (the alternative if the frontend called each service's own origin directly,
  which would also need cross-origin cookie config — `SameSite=None; Secure` plus a shared trusted
  cookie domain — for no real benefit here). It's also the same cookie `frontend/src/proxy.ts`
  already reads directly (`request.cookies.get(AUTH_COOKIE_NAME)`) to verify the JWT server-side
  before a protected page even renders — a token in `localStorage` wouldn't be visible there at all.

**Why stateless JWT verification (not "call auth-service to check the session")** — the other half
of the auth design, and the more important one once there are 4 services instead of 1:

- **What "stateless" means here.** A JWT is a signed blob — `header.payload.signature`, base64url
  encoded. The signature is computed over the header+payload using a secret only the issuer knows
  (`backend/src/utils/jwt.ts` signs with `JWT_SECRET`, HMAC). Anyone holding that same secret can
  **independently recompute the signature and confirm the token is genuine and untampered**, purely
  from the token itself — no database lookup, no network call to whoever issued it. The payload
  already carries everything a service needs (`employeeId`, `organizationId`, and a `type`
  discriminant — `access`/`password_reset`/`registration`/`onboarding` — that `jwt.ts` checks on
  every verify), so verifying the signature is enough to trust those claims too.
- **The alternative this avoids: a session store.** The other common pattern is opaque session IDs
  looked up against a shared store (a DB table or Redis) on every request. That works fine for one
  process, but across 4 independent services it would mean **every single request to
  claim-service/reports-service/etc. makes a synchronous call back to auth-service** just to find
  out who's calling — turning auth-service into a hard runtime dependency and a latency multiplier
  for literally every endpoint in the system, and a single point of failure that takes the whole
  app down if it's ever slow or unreachable.
- **This isn't a new pattern being invented for the split** — `frontend/src/proxy.ts` already does
  exactly this today: `jwt.verify(token, JWT_SECRET)` re-checks the signature and `type === "access"`
  independently, entirely separately from the backend's own `requireAuth` check, with no call to the
  backend at all. Each of the 4 services doing the same thing is just that identical technique
  applied at one more layer.
- **The trade-off, restated concisely (full detail in `microservices-plan.md`'s "Open risks"):**
  because there's no central check, a suspend/logout/password-change doesn't invalidate an
  already-issued token — it just keeps verifying successfully until it naturally expires. This is
  managed, not eliminated, by keeping the access-token TTL short once the currently-missing
  `/api/auth/refresh` endpoint exists (Phase 2 of the extraction plan) — short-lived tokens bound
  the window, without forcing the frontend to re-authenticate constantly.

**In short, applied to this system:**

- Login, registration-complete, and onboarding-complete all happen against **auth-service**, which
  issues the access-token JWT and sets it as the httpOnly session cookie (`accessTokenCookieOptions()`,
  now in `auth-service/src/utils/auth.ts` — moved there in Phase 3, along with everything else that
  issues tokens).
- Because the browser only ever talks to the **gateway's** single origin, the cookie's domain is
  the gateway's domain — every service behind it can read the same cookie via the `Cookie` header
  the gateway forwards. No cross-origin cookie problem, despite the backend now being five separate
  processes.
- Every service (auth-service, claim-service, reports-service) verifies that same JWT independently,
  using the shared `JWT_SECRET` — none of them call auth-service to do it.

### 1.4 Representative request flows

**a) Login** — Browser → Gateway → auth-service (validates credentials, sets cookie) → response
back through the gateway. No other service involved; identical shape to today.

**b) Send Employee Invite** (`008`) — Browser → Gateway → auth-service `POST
/employees/:id/send-invite` → auth-service writes the `EmployeeInvite` log row → auth-service calls
communications-service (`POST /internal/notifications/email`) → response bubbles back through the
gateway. The frontend still sees exactly one HTTP round trip — the extra service hop is invisible to
the browser.

**c) AI-Powered Claim extraction** (`023`) — already an async/polling flow today, unchanged in
shape: Browser → Gateway → claim-service `POST /claims/:id/process` (`202`, kicks off a background
task) → claim-service calls ai-service (already HTTP, contract unchanged) → frontend polls `GET
/claims/:id/process-status` through the gateway → claim-service, same polling UX already built.
The one internal difference (invisible to the frontend): ai-service now writes its own
`AiExtractionLog` audit row (`pending` → `completed`/`failed`) into its own MySQL database as part of
handling the extraction, and claim-service's `process-status` handler reads that status from
ai-service's own API instead of a local table it used to own — see `microservices-plan.md`'s
extraction-order Phase 4 for why.

**d) Split Claim notification** (`025`) — Browser → Gateway → claim-service `POST
.../split-requests` → claim-service calls communications-service for the colleague email → response
returns once the DB write completes (the email send doesn't block the response today; same posture
carries over).

**e) Reports** (future, once built) — Browser → Gateway → reports-service → reports-service calls
auth-service's and claim-service's own read APIs → aggregates in memory → responds. **This is the
one flow where a single frontend request can trigger three services round-tripping** — flag it as
the one place to watch latency once Reports is actually built.

## 2. What changes on the frontend

### 2.1 The single biggest decision: the gateway exists specifically to avoid frontend churn

`apiManager.ts` already centralizes the base URL and cookie handling in one place
(`API_BASE_URL`/`credentials: "include"`), and every `src/apis/<domain>/*.api.ts` file calls a
fixed relative path. **If the gateway reproduces today's exact path structure (section 1.2), the
`src/apis/` layer needs zero code changes** — every existing `.api.ts` file keeps calling the same
relative path, unaware it's now being routed to a different backend service entirely.

That's the design goal driving the whole gateway decision: the "done" bar for the frontend
integration is that the gateway's routing table matches section 1.2 exactly, and every service's
error-response shape stays `{ error: string }` — matching `apiManager.ts`'s `isErrorBody` check,
which every `ApiError` throw depends on. A service that returns a differently-shaped error breaks
error handling silently, with no compile-time signal.

### 2.2 Concrete changes required

1. **`NEXT_PUBLIC_API_BASE_URL`** — points at the gateway's origin instead of directly at
   `claim-service`'s `:4000` (the frontend's own env var name is unchanged from when it pointed at
   the original `backend`). One env var change, no code change.
2. **`.env.local`/`.env.example`'s `JWT_SECRET`/`AUTH_COOKIE_NAME`** (read by `src/proxy.ts`) must
   match **auth-service's** issuing secret/cookie name going forward, since `Employee`/session
   issuance moved there in Phase 3. Same two env vars, same file — this is a "coordinate the secret with a
   different service" step, not a code change. `proxy.ts` itself needs no edits.
3. **Local dev workflow** (not frontend code) — `docker-compose`/dev scripts now run a gateway + 4
   services instead of 1 backend process; `.env.local`'s `NEXT_PUBLIC_API_BASE_URL` points at the
   gateway's local port.
4. **A new `src/apis/reports/` domain folder**, only once reports-service is actually built —
   genuinely new code, not a migration, since Reports has no existing frontend implementation to
   carry over (`(private)/reports/page.tsx` is still a placeholder today).
5. **No changes needed to**: `apiManager.ts` itself, `SessionContext`, any existing `.api.ts` file,
   any page/component, any route in `src/app/`.

### 2.3 Things that must not drift, or the "no code change" claim breaks

- **Error shape** — every service's error middleware must return the identical `{ error: string }`
  JSON `error-handler.ts` returns today.
- **Cookie attributes** — name, `httpOnly`, `sameSite`, `secure`, `path` must stay identical to
  today's `accessTokenCookieOptions()`, now set by auth-service and forwarded unchanged by the
  gateway.
- **CORS moves to the gateway only.** `cors({ origin: env.corsOrigin, credentials: true })` (today
  in `backend/src/app.ts`) moves to the gateway; auth-service/claim-service/communications-service/
  ai-service are never called directly by a browser, so none of them need their own CORS config at
  all — a simplification versus running four independently browser-reachable origins.
- **Binary/file endpoints stay raw streams through the gateway.** `apiManager.ts`'s
  `downloadFile`/`uploadFile` (bulk-invite template/error-report downloads on auth-service, invoice
  file content on claim-service) must be proxied as-is, not JSON-parsed by the gateway — same route
  paths, same content-type/blob response shape as today.

## 3. Risks specific to this integration

- **No shared contract/type layer between frontend and backend today** (no OpenAPI spec, no
  generated client) — if the gateway's routing table ever drifts from a service's actual routes
  (e.g. a route gets renamed inside claim-service without updating the gateway), the frontend gets a
  silent 404 with no compile-time signal. Worth adding a lightweight CI check that hits every
  `src/apis/**/*.api.ts` path through the gateway once this ships, rather than discovering drift in
  production.
- **Reports' multi-hop fan-out** (flow 1.4e) is the one place the frontend might eventually need a
  longer loading state or timeout handling it doesn't need anywhere else — not an issue today since
  Reports isn't built, but worth flagging before that work starts.
- `frontend/src/proxy.ts`'s own comment already notes its JWT check doesn't know about revocation
  and defers to the backend's real check on every actual API call. That property still has to hold
  after the split — every service, not just auth-service, must independently enforce the
  `requireAuth`-equivalent check on its own endpoints. Not a new risk, just now spread across three
  services' worth of routes instead of one.

## Completion notes

Built as `gateway-service/` (own `CLAUDE.md` there — routing table, adding-a-new-prefix instructions), following section 1.0's recommended implementation option 1 exactly: a small Express app on `http-proxy-middleware`, no database, no business logic. Runs on `http://localhost:4400`. Section 1.2's routing table was copied in as two plain arrays (`AUTH_SERVICE_PATHS`/`CLAIM_SERVICE_PATHS` in `gateway-service/src/routes/proxy-routes.ts`) — `/api/reports*` isn't wired up yet since `reports-service` doesn't exist; add a third array + `createProxyMiddleware` instance for it when Phase 5 lands.

One deviation from a literal reading of section 1.2: rather than `app.use(prefix, createProxyMiddleware(...))` per prefix, all proxying is mounted at the app root and dispatched via a manual `req.path` prefix check (`app.ts`'s `matchesPrefix`). Express strips the mount prefix from `req.url` before a `app.use(prefix, ...)` middleware sees it, which would have silently altered every proxied path — mounting at root sidesteps that entirely, which matters here since section 2.1's whole "no frontend code changes" claim depends on paths staying byte-identical.

Deliberately does **not** parse the request body (no `express.json()`) before proxying, per section 1.0's "thin routing layer" framing — parsing would consume the body stream before the proxy could forward it; each service parses its own body exactly as it did when called directly.

Section 2.2's concrete changes, as actually done:
1. `frontend/.env` **and** `frontend/.env.local`'s `NEXT_PUBLIC_API_BASE_URL` both had to be updated to `http://localhost:4400/api` — Next.js loads `.env.local` with higher priority than `.env`, and `.env.local` already had the old direct-to-claim-service URL, so editing only `.env` silently did nothing on the first attempt. Worth remembering for the next env-var change to this project: check for a `.env.local` override before assuming `.env`/`.env.example` are the whole picture.
2. `JWT_SECRET`/`AUTH_COOKIE_NAME` were already correct (previously set to match auth-service) — no change needed.
3. No `docker-compose.yml`/dev-script change was needed — this repo already runs every app service (frontend/claim-service/auth-service/communications-service/ai-service) as a local process via `npm run dev`/`uv run`, not in Docker (only the databases are containerized), so `gateway-service` follows the same existing pattern (`npm run dev` on port 4400) rather than introducing a new Docker service.
4. `src/apis/reports/` — still not needed, Reports still isn't built.
5. Confirmed true: zero changes to `apiManager.ts`, `SessionContext`, any `.api.ts` file, or any page/route.

Verified end-to-end, not just per-service: real browser login (Playwright) through `http://localhost:3000/login` → `POST http://localhost:4400/api/auth/login` (200, cookie set) → redirected to `/dashboard` with real user/org data rendered — and a claim-service route (`GET /api/countries`) authenticated with that same cookie through the same gateway, confirming both halves of the routing table and the cross-service cookie flow described in section 1.3 actually work together, not just individually.
