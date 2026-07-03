import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type AccessTokenPayload = {
  type: "access";
  sub: number;
};

export type ResetTokenPayload = {
  type: "password_reset";
  email: string;
  otpId: number;
};

export function signAccessToken(userId: number): string {
  const payload: AccessTokenPayload = { type: "access", sub: userId };
  return jwt.sign(payload, env.auth.jwtSecret, { expiresIn: env.auth.accessTokenExpiresIn } as jwt.SignOptions);
}

export function signResetToken(email: string, otpId: number): string {
  const payload: ResetTokenPayload = { type: "password_reset", email, otpId };
  return jwt.sign(payload, env.auth.jwtSecret, { expiresIn: env.auth.resetTokenExpiresIn } as jwt.SignOptions);
}

function isAccessTokenPayload(value: unknown): value is AccessTokenPayload {
  return typeof value === "object" && value !== null && (value as { type?: unknown }).type === "access";
}

function isResetTokenPayload(value: unknown): value is ResetTokenPayload {
  return typeof value === "object" && value !== null && (value as { type?: unknown }).type === "password_reset";
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
