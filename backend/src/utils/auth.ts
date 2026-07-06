import type { CookieOptions } from "express";
import { env } from "../config/env";
import { Organization, OrganizationMember, type User } from "../models";

export function accessTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    maxAge: env.auth.accessTokenCookieMaxAgeMs,
    path: "/",
  };
}

export function toPublicUser(user: User): { id: number; name: string; email: string; phone: string | null } {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone };
}

// A user can belong to more than one organization over time (see
// user-stories/002-organization-signup.md), so this returns their current/active
// one — today that's just "the first membership found" since there's no
// switch-organization feature yet to make "current" mean anything more specific.
export async function getCurrentOrganization(
  userId: number
): Promise<{ id: number; name: string; gstNumber: string } | null> {
  const membership = await OrganizationMember.findOne({ where: { userId } });
  if (!membership) return null;

  const organization = await Organization.findByPk(membership.organizationId);
  if (!organization) return null;

  return { id: organization.id, name: organization.name, gstNumber: organization.gstNumber };
}
