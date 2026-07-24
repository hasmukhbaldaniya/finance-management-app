// Fixed, product-defined privilege catalog — not organization-editable, no CRUD
// for privileges themselves. Kept byte-identical to the frontend's copy (same
// convention as the regex constants in this file's sibling module).
export const PRIVILEGE_KEYS = [
  "employee_management",
  "basic_features",
  "category_management",
  "create_claims_trips",
  "claim_trip_approvals",
  "reports",
  "finance_view",
  "consumption_billing",
] as const;

export type PrivilegeKey = (typeof PRIVILEGE_KEYS)[number];

export function isValidPrivilegeKey(value: unknown): value is PrivilegeKey {
  return typeof value === "string" && (PRIVILEGE_KEYS as readonly string[]).includes(value);
}

export const COMPANY_ADMIN_ROLE_NAME = "Company Admin";
export const MEMBERS_ROLE_NAME = "Members";

export const MEMBERS_ROLE_PRIVILEGES: PrivilegeKey[] = [
  "employee_management",
  "basic_features",
  "category_management",
  "create_claims_trips",
];
