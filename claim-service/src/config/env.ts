import dotenv from "dotenv";

dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv: requireEnv("NODE_ENV", "development"),
  port: Number(requireEnv("PORT", "4000")),
  corsOrigin: requireEnv("CORS_ORIGIN", "http://localhost:3000"),
  db: {
    host: requireEnv("DB_HOST", "localhost"),
    port: Number(requireEnv("DB_PORT", "5434")),
    name: requireEnv("DB_NAME", "claim_service"),
    user: requireEnv("DB_USER", "postgres"),
    password: requireEnv("DB_PASSWORD", "postgres"),
  },
  // This service no longer issues any tokens (login/registration/onboarding
  // moved to auth-service, docs/PLANS/microservices-plan.md's Phase 3) — only
  // jwtSecret (to verify) and cookieName (to read the cookie) are still
  // needed here. jwtSecret must match auth-service's byte-for-byte.
  auth: {
    jwtSecret: requireEnv("JWT_SECRET"),
    cookieName: requireEnv("AUTH_COOKIE_NAME", "auth_token"),
  },
  // 023's AI/ML service — a standalone microservice (../ai-service), not
  // in-process. This backend only knows its URL and an optional shared
  // secret; the Anthropic API key itself lives only in that service's own
  // env (see ai-extraction.service.ts, the HTTP client for it).
  aiService: {
    url: requireEnv("AI_SERVICE_URL", "http://localhost:4100"),
    internalApiKey: process.env.AI_SERVICE_INTERNAL_API_KEY,
  },
  // Phase 1 of docs/PLANS/microservices-plan.md — a standalone microservice
  // (../communications-service), not in-process. SMTP config now lives only
  // in that service's own env; this backend only knows its URL and an
  // optional shared secret (see communications.service.ts, the HTTP client
  // for it).
  communicationsService: {
    url: requireEnv("COMMUNICATIONS_SERVICE_URL", "http://localhost:4200"),
    internalApiKey: process.env.COMMUNICATIONS_SERVICE_INTERNAL_API_KEY,
  },
  // Phase 3 of docs/PLANS/microservices-plan.md — this backend (soon to be
  // claim-service) no longer has local DB access to Employee; the one real
  // cross-service read it still needs (names/emails for category "created
  // by", split-request colleagues, duplicate-bill-detection's claimant) goes
  // through auth-service's internal employee-lookup endpoint instead.
  authService: {
    url: requireEnv("AUTH_SERVICE_URL", "http://localhost:4300"),
    internalApiKey: process.env.AUTH_SERVICE_INTERNAL_API_KEY,
  },
};
