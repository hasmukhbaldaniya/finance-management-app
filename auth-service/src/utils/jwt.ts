import jwt from "jsonwebtoken";
import { env } from "../config/env";

// organizationId is embedded here (not just employee id) because it's
// immutable per employee (see backend/CLAUDE.md's "The User → Employee
// merge" — organizationId is fixed at creation, there's no more "active
// organization" to switch) — so it's safe to bake into the token at issue
// time. This is what lets every other service verify the token statelessly
// AND know which organization the caller belongs to with zero DB/HTTP calls
// on the hot path — the single biggest cross-service call site
// docs/PLANS/microservices-plan.md's Phase 3 identified (getActiveOrganizationId,
// called on nearly every claim/category/trip request) collapses into a plain
// JWT-claim read.
export type AccessTokenPayload = {
  type: "access";
  sub: number;
  organizationId: number;
};

export type ResetTokenPayload = {
  type: "password_reset";
  email: string;
  otpId: number;
};

export type RegistrationTokenPayload = {
  type: "registration";
  userId: number;
  email: string;
};

export type RefreshTokenPayload = {
  type: "refresh";
  sub: number;
};

export type OnboardingTokenPayload = {
  type: "onboarding";
  employeeId: number;
  email: string;
  // The EmployeeInvite row's own `sentAt` (epoch ms) this token was minted
  // for — lets requireOnboardingEmployee reject a token once a newer invite
  // has been sent, so "resend supersedes, doesn't extend" (011's own Flow
  // point 3 / TC-13) is actually enforced, not just true until expiry.
  sentAt: number;
};

export function signAccessToken(userId: number, organizationId: number): string {
  const payload: AccessTokenPayload = { type: "access", sub: userId, organizationId };
  return jwt.sign(payload, env.auth.jwtSecret, { expiresIn: env.auth.accessTokenExpiresIn } as jwt.SignOptions);
}

export function signResetToken(email: string, otpId: number): string {
  const payload: ResetTokenPayload = { type: "password_reset", email, otpId };
  return jwt.sign(payload, env.auth.jwtSecret, { expiresIn: env.auth.resetTokenExpiresIn } as jwt.SignOptions);
}

export function signRegistrationToken(userId: number, email: string): string {
  const payload: RegistrationTokenPayload = { type: "registration", userId, email };
  return jwt.sign(payload, env.auth.jwtSecret, { expiresIn: env.auth.registrationTokenExpiresIn } as jwt.SignOptions);
}

export function signRefreshToken(userId: number): string {
  const payload: RefreshTokenPayload = { type: "refresh", sub: userId };
  return jwt.sign(payload, env.auth.jwtSecret, { expiresIn: env.auth.refreshTokenExpiresIn } as jwt.SignOptions);
}

// One token covers the entire 4-step onboarding flow (011-employee-onboarding.md)
// — unlike registrationToken, it is never exchanged for a fresh one partway
// through, so its 10-minute expiry is a single flat window for all 4 steps,
// not 10 minutes per step. See that story's Open Questions for why.
export function signOnboardingToken(employeeId: number, email: string, sentAt: Date): string {
  const payload: OnboardingTokenPayload = { type: "onboarding", employeeId, email, sentAt: sentAt.getTime() };
  return jwt.sign(payload, env.auth.jwtSecret, { expiresIn: env.auth.onboardingTokenExpiresIn } as jwt.SignOptions);
}

function isAccessTokenPayload(value: unknown): value is AccessTokenPayload {
  return typeof value === "object" && value !== null && (value as { type?: unknown }).type === "access";
}

function isResetTokenPayload(value: unknown): value is ResetTokenPayload {
  return typeof value === "object" && value !== null && (value as { type?: unknown }).type === "password_reset";
}

function isRegistrationTokenPayload(value: unknown): value is RegistrationTokenPayload {
  return typeof value === "object" && value !== null && (value as { type?: unknown }).type === "registration";
}

function isOnboardingTokenPayload(value: unknown): value is OnboardingTokenPayload {
  return typeof value === "object" && value !== null && (value as { type?: unknown }).type === "onboarding";
}

function isRefreshTokenPayload(value: unknown): value is RefreshTokenPayload {
  return typeof value === "object" && value !== null && (value as { type?: unknown }).type === "refresh";
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded: unknown = jwt.verify(token, env.auth.jwtSecret);
    return isAccessTokenPayload(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

export function verifyResetToken(token: string): ResetTokenPayload | null {
  try {
    const decoded: unknown = jwt.verify(token, env.auth.jwtSecret);
    return isResetTokenPayload(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

export function verifyRegistrationToken(token: string): RegistrationTokenPayload | null {
  try {
    const decoded: unknown = jwt.verify(token, env.auth.jwtSecret);
    return isRegistrationTokenPayload(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

export function verifyOnboardingToken(token: string): OnboardingTokenPayload | null {
  try {
    const decoded: unknown = jwt.verify(token, env.auth.jwtSecret);
    return isOnboardingTokenPayload(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded: unknown = jwt.verify(token, env.auth.jwtSecret);
    return isRefreshTokenPayload(decoded) ? decoded : null;
  } catch {
    return null;
  }
}
