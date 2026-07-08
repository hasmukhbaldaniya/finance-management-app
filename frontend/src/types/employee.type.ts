export type EmployeeTitle = "Mr" | "Mrs" | "Ms";
export type EmployeeGender = "Male" | "Female" | "Other";
export type EmployeeInvitationStatus = "pending" | "registered";
export type EmployeeStatus = "active" | "suspended";

export type EmployeePickerOption = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

export type ApproverLevel = {
  level: number;
  approverEmployeeId: number | null;
};

export type EmployeeListItem = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string | null;
  department: string | null;
  grade: string | null;
  countryCode: string | null;
  contactNumber: string | null;
  invitationStatus: EmployeeInvitationStatus;
  status: EmployeeStatus;
};

export type EmployeeStatusFilterValue = "active" | "suspended" | "pending";

export type EmployeeSortBy =
  | "firstName"
  | "email"
  | "role"
  | "department"
  | "grade"
  | "contactNumber"
  | "invitationStatus"
  | "status";
export type { SortDirection } from "./pagination.type";

export type EmployeeBasicInfo = {
  id: number;
  title: EmployeeTitle | null;
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string | null;
  contactNumber: string | null;
  dob: string | null;
  gender: EmployeeGender | null;
  employeeCode: string | null;
};

export type BulkUploadErrorRow = {
  row: number;
  employeeName: string;
  employeeEmail: string;
  message: string;
};

export type BulkUploadSummary = {
  uploadId: number;
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors: BulkUploadErrorRow[];
};

export type BulkImportResult = {
  total: number;
  created: number;
  updated: number;
  failed: number;
};

export type MyProfile = {
  id: number;
  title: EmployeeTitle | null;
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string | null;
  contactNumber: string | null;
  dob: string | null;
  gender: EmployeeGender | null;
  employeeCode: string | null;
  status: EmployeeStatus;
  invitationStatus: EmployeeInvitationStatus;
  organizationName: string | null;
  role: string | null;
  department: string | null;
  grade: string | null;
};
