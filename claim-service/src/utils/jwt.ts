import jwt from "jsonwebtoken";
import { env } from "../config/env";

// Verify-only — this backend no longer issues any tokens itself (login/
// registration/onboarding all moved to auth-service, docs/PLANS/microservices-plan.md's
// Phase 3). JWT_SECRET must match auth-service's byte-for-byte; a mismatch
// fails safe (every request here 401s) rather than granting access.
//
// organizationId is embedded in the payload by auth-service at issue time
// (safe since Employee.organizationId is immutable once set — see
// backend/CLAUDE.md's "The User → Employee merge") — reading it straight off
// the verified claim in require-auth.ts is what lets every claim/category/
// trip handler here know the caller's organization with zero DB/HTTP calls,
// replacing the old getActiveOrganizationId(userId) DB lookup that used to
// run on nearly every request.
export type AccessTokenPayload = {
  type: "access";
  sub: number;
  organizationId: number;
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
