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
};
