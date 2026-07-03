import jwt from "jsonwebtoken";
import { NextResponse, type NextRequest } from "next/server";
import { ROUTES } from "@/utils/constants/route.constant";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? "auth_token";

function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing required environment variable: JWT_SECRET");
  }
  return secret;
}

const JWT_SECRET = requireJwtSecret();

// This re-verifies signature + expiry independently of backend/src/utils/jwt.ts's
// verifyAccessToken — there's no shared package between the two apps to import it from.
// It intentionally does NOT know about revocation: if the backend ever gains a way to
// invalidate a still-unexpired token (logout-all-devices, password-change invalidation,
// a blacklist), this check has no way to see that and will keep admitting the token here.
// The backend's own requireAuth is the actual source of truth for every real API call;
// this only gates whether the page shell renders, so a stale accept here can't grant
// access to anything requireAuth wouldn't independently allow.
function hasValidAccessToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return typeof decoded === "object" && decoded !== null && decoded.type === "access";
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!hasValidAccessToken(token)) {
    const loginUrl = new URL(ROUTES.LOGIN, request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
