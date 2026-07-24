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
  port: Number(requireEnv("PORT", "4300")),
  corsOrigin: requireEnv("CORS_ORIGIN", "http://localhost:3000"),
  db: {
    host: requireEnv("DB_HOST", "localhost"),
    port: Number(requireEnv("DB_PORT", "5433")),
    name: requireEnv("DB_NAME", "auth_service"),
    user: requireEnv("DB_USER", "postgres"),
    password: requireEnv("DB_PASSWORD", "postgres"),
  },
  auth: {
    // JWT_SECRET/AUTH_COOKIE_NAME/REFRESH_COOKIE_NAME must match byte-for-byte
    // across auth-service (issuer), backend (verifier, for its own remaining
    // claim/category/trip routes), and frontend/proxy.ts (verifier) — there's
    // no shared package to import this from, the same "kept in sync by hand"
    // situation frontend/.env.example already documents for JWT_SECRET.
    jwtSecret: requireEnv("JWT_SECRET"),
    accessTokenExpiresIn: requireEnv("ACCESS_TOKEN_EXPIRES_IN", "1d"),
    accessTokenCookieMaxAgeMs: Number(requireEnv("ACCESS_TOKEN_COOKIE_MAX_AGE_MS", String(24 * 60 * 60 * 1000))),
    cookieName: requireEnv("AUTH_COOKIE_NAME", "auth_token"),
    refreshCookieName: requireEnv("REFRESH_COOKIE_NAME", "refresh_token"),
    otpExpiryMinutes: Number(requireEnv("OTP_EXPIRY_MINUTES", "10")),
    otpResendCooldownSeconds: Number(requireEnv("OTP_RESEND_COOLDOWN_SECONDS", "30")),
    resetTokenExpiresIn: requireEnv("RESET_TOKEN_EXPIRES_IN", "10m"),
    registrationTokenExpiresIn: requireEnv("REGISTRATION_TOKEN_EXPIRES_IN", "15m"),
    refreshTokenExpiresIn: requireEnv("REFRESH_TOKEN_EXPIRES_IN", "30d"),
    refreshTokenCookieMaxAgeMs: Number(requireEnv("REFRESH_TOKEN_COOKIE_MAX_AGE_MS", String(30 * 24 * 60 * 60 * 1000))),
    onboardingTokenExpiresIn: requireEnv("ONBOARDING_TOKEN_EXPIRES_IN", "10m"),
  },
  // Phase 1 of docs/PLANS/microservices-plan.md — a standalone microservice
  // (../communications-service), not in-process. This service only knows its
  // URL and an optional shared secret (see communications.service.ts).
  communicationsService: {
    url: requireEnv("COMMUNICATIONS_SERVICE_URL", "http://localhost:4200"),
    internalApiKey: process.env.COMMUNICATIONS_SERVICE_INTERNAL_API_KEY,
  },
  // Optional shared secret backend/claim-service send as X-Internal-Api-Key
  // when calling this service's /internal/* routes (employee lookups) — same
  // opt-in-if-set posture as ai-service's/communications-service's own
  // internal auth.
  internalApiKey: process.env.INTERNAL_API_KEY,
};
