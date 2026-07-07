import type { CookieOptions } from "express";
import { env } from "../config/env";
import { Employee, Organization } from "../models";

export function accessTokenCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    maxAge: env.auth.accessTokenCookieMaxAgeMs,
    path: "/",
  };
}

// Keeps the frontend's AuthUser response shape ({id, name, email, phone})
// unchanged even though Employee doesn't have single name/phone columns —
// name is derived from firstName/lastName, phone from contactNumber (no
// country code, matching the old User.phone's bare-digits shape exactly).
export function toPublicEmployee(employee: Employee): { id: number; name: string; email: string; phone: string | null } {
  return {
    id: employee.id,
    name: `${employee.firstName} ${employee.lastName}`.trim(),
    email: employee.email,
    phone: employee.contactNumber,
  };
}

// Employee.organizationId is fixed at creation — there's no more "active
// organization" indirection to resolve (no switching, see 003's removal).
export async function getCurrentOrganization(
  employee: Employee
): Promise<{ id: number; name: string; gstNumber: string } | null> {
  const organization = await Organization.findByPk(employee.organizationId);
  if (!organization) return null;
  return { id: organization.id, name: organization.name, gstNumber: organization.gstNumber };
}

// Signature unchanged so every org-scoped controller (grade/department/role/
// project/employee) needing "which org is this caller in" keeps working
// without modification — only the underlying lookup moved off User.
export async function getActiveOrganizationId(userId: number | undefined): Promise<number | null> {
  if (!userId) return null;
  const employee = await Employee.findByPk(userId);
  return employee?.organizationId ?? null;
}

export async function isOrganizationOwner(userId: number, organizationId: number): Promise<boolean> {
  const employee = await Employee.findByPk(userId);
  return employee?.isOwner === true && employee.organizationId === organizationId;
}
