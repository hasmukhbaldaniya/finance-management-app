import jwt from "jsonwebtoken";
import { NextResponse, type NextRequest } from "next/server";
import { ROUTES } from "@/utils/constants/route.constant";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? "auth_token";
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-insecure-secret-change-me";

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
