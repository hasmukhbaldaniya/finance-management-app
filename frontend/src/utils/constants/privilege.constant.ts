// Fixed, product-defined privilege catalog — not organization-editable, no CRUD
// for privileges themselves. Kept byte-identical (keys + order) to the
// backend's copy in backend/src/utils/constants/role.constant.ts.
export const PRIVILEGE_CATALOG = [
  { key: "employee_management", label: "Employee management" },
  { key: "basic_features", label: "Basic Features" },
  { key: "category_management", label: "Category Management" },
  { key: "create_claims_trips", label: "Create Claim / Trips" },
  { key: "claim_trip_approvals", label: "Claim / Trip Approvals" },
  { key: "reports", label: "Reports" },
  { key: "finance_view", label: "Finance View" },
  { key: "consumption_billing", label: "Consumption & Billing" },
] as const;

export type PrivilegeKey = (typeof PRIVILEGE_CATALOG)[number]["key"];
