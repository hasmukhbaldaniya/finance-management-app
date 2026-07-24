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
  port: Number(requireEnv("PORT", "4200")),
  corsOrigin: requireEnv("CORS_ORIGIN", "http://localhost:4000"),
  mongoUri: requireEnv("MONGO_URI", "mongodb://localhost:27017/communications_service"),
  smtp: {
    host: requireEnv("SMTP_HOST", "smtp.gmail.com"),
    port: Number(requireEnv("SMTP_PORT", "587")),
    user: requireEnv("SMTP_USER"),
    password: requireEnv("SMTP_PASSWORD"),
    from: requireEnv("SMTP_FROM", "no-reply@finance-management.local"),
  },
  // Optional shared secret the calling service sends as X-Internal-Api-Key —
  // no fallback/required check here, unset just means requireInternalAuth
  // skips the check entirely (see that file).
  internalApiKey: process.env.INTERNAL_API_KEY,
};
