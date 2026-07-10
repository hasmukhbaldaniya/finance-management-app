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
    port: Number(requireEnv("DB_PORT", "5432")),
    name: requireEnv("DB_NAME", "finance_management"),
    user: requireEnv("DB_USER", "postgres"),
    password: requireEnv("DB_PASSWORD", "postgres"),
  },
  auth: {
    jwtSecret: requireEnv("JWT_SECRET"),
    accessTokenExpiresIn: requireEnv("ACCESS_TOKEN_EXPIRES_IN", "1d"),
    accessTokenCookieMaxAgeMs: Number(requireEnv("ACCESS_TOKEN_COOKIE_MAX_AGE_MS", String(24 * 60 * 60 * 1000))),
    cookieName: requireEnv("AUTH_COOKIE_NAME", "auth_token"),
    otpExpiryMinutes: Number(requireEnv("OTP_EXPIRY_MINUTES", "10")),
    otpResendCooldownSeconds: Number(requireEnv("OTP_RESEND_COOLDOWN_SECONDS", "30")),
    resetTokenExpiresIn: requireEnv("RESET_TOKEN_EXPIRES_IN", "10m"),
    registrationTokenExpiresIn: requireEnv("REGISTRATION_TOKEN_EXPIRES_IN", "15m"),
    refreshTokenExpiresIn: requireEnv("REFRESH_TOKEN_EXPIRES_IN", "30d"),
    onboardingTokenExpiresIn: requireEnv("ONBOARDING_TOKEN_EXPIRES_IN", "10m"),
  },
  smtp: {
    host: requireEnv("SMTP_HOST", "smtp.gmail.com"),
    port: Number(requireEnv("SMTP_PORT", "587")),
    user: requireEnv("SMTP_USER"),
    password: requireEnv("SMTP_PASSWORD"),
    from: requireEnv("SMTP_FROM", "no-reply@finance-management.local"),
  },
  // 023's AI/ML service — a standalone microservice (../ai-service), not
  // in-process. This backend only knows its URL and an optional shared
  // secret; the Anthropic API key itself lives only in that service's own
  // env (see ai-extraction.service.ts, the HTTP client for it).
  aiService: {
    url: requireEnv("AI_SERVICE_URL", "http://localhost:4100"),
    internalApiKey: process.env.AI_SERVICE_INTERNAL_API_KEY,
  },
};
