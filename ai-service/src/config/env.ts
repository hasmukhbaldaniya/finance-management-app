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
  port: Number(requireEnv("PORT", "4100")),
  corsOrigin: requireEnv("CORS_ORIGIN", "http://localhost:4000"),
  // No fallback for either — unset means the service degrades to a clear
  // "not configured" result per call instead of silently faking one.
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  aiModel: requireEnv("AI_MODEL", "claude-sonnet-5"),
  internalApiKey: process.env.INTERNAL_API_KEY,
};
