export type EmployeeTitle = "Mr" | "Mrs" | "Ms";
export type EmployeeGender = "Male" | "Female" | "Other";

export type EmployeePickerOption = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

export type ModuleAccessKey = "trips" | "claims" | "approvals" | "finance" | "reports";

export const MODULE_ACCESS_OPTIONS: { key: ModuleAccessKey; label: string }[] = [
  { key: "trips", label: "Trips" },
  { key: "claims", label: "Claims" },
  { key: "approvals", label: "Approvals" },
  { key: "finance", label: "Finance" },
  { key: "reports", label: "Reports" },
];

export type ApproverLevel = {
  level: number;
  approverEmployeeId: number | null;
};
