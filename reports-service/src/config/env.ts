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
  port: Number(requireEnv("PORT", "4500")),
  corsOrigin: requireEnv("CORS_ORIGIN", "http://localhost:3000"),
  authServiceUrl: requireEnv("AUTH_SERVICE_URL", "http://localhost:4300"),
  claimServiceUrl: requireEnv("CLAIM_SERVICE_URL", "http://localhost:4000"),
  // Verify-only, mirroring claim-service's own jwt.ts — this service never
  // issues tokens. Must match auth-service's JWT_SECRET/AUTH_COOKIE_NAME
  // byte-for-byte; a mismatch fails safe (every request here 401s) rather
  // than granting access.
  auth: {
    jwtSecret: requireEnv("JWT_SECRET"),
    cookieName: requireEnv("AUTH_COOKIE_NAME", "auth_token"),
  },
};
