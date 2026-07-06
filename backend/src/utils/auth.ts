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
// user-stories/002-organization-signup.md); which one is "current" is tracked by
// User.activeOrganizationId (see user-stories/003-header-navigation.md), switchable
// via PATCH /api/users/me/active-organization. Falls back to the first membership
// found for a legacy row where that column is unexpectedly still null.
export async function getCurrentOrganization(
  user: User
): Promise<{ id: number; name: string; gstNumber: string } | null> {
  if (user.activeOrganizationId) {
    const organization = await Organization.findByPk(user.activeOrganizationId);
    if (organization) {
      return { id: organization.id, name: organization.name, gstNumber: organization.gstNumber };
    }
  }

  const membership = await OrganizationMember.findOne({ where: { userId: user.id } });
  if (!membership) return null;

  const organization = await Organization.findByPk(membership.organizationId);
  if (!organization) return null;

  return { id: organization.id, name: organization.name, gstNumber: organization.gstNumber };
}
