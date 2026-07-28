import jwt from "jsonwebtoken";
import { env } from "../config/env";

// Verify-only, mirroring claim-service's own utils/jwt.ts exactly — this
// service never issues tokens. JWT_SECRET must match auth-service's
// byte-for-byte; a mismatch fails safe (every request here 401s) rather
// than granting access.
export type AccessTokenPayload = {
  type: "access";
  sub: number;
  organizationId: number;
  isOwner: boolean;
};

function isAccessTokenPayload(value: unknown): value is AccessTokenPayload {
  return typeof value === "object" && value !== null && (value as { type?: unknown }).type === "access";
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded: unknown = jwt.verify(token, env.auth.jwtSecret);
    return isAccessTokenPayload(decoded) ? decoded : null;
  } catch {
    return null;
  }
}
