// Column order/required-ness matches user-stories/010-bulk-invite-employees.md's
// "Download Sample File" table exactly — this single list drives both the
// template generator and the upload parser's header-to-field mapping, so the
// two can never drift out of sync with each other.
export type BulkColumnKey =
  | "title"
  | "firstName"
  | "lastName"
  | "email"
  | "countryCode"
  | "contactNumber"
  | "dob"
  | "gender"
  | "employeeCode"
  | "company"
  | "role"
  | "department"
  | "grade"
  | "projects";

export type BulkColumnDef = { header: string; key: BulkColumnKey; required: boolean };

export const BULK_COLUMNS: readonly BulkColumnDef[] = [
  { header: "Title", key: "title", required: true },
  { header: "First Name", key: "firstName", required: true },
  { header: "Last Name", key: "lastName", required: true },
  { header: "Email", key: "email", required: true },
  { header: "Country Code", key: "countryCode", required: true },
  { header: "Contact Number", key: "contactNumber", required: true },
  { header: "DOB", key: "dob", required: false },
  { header: "Gender", key: "gender", required: true },
  { header: "Employee ID", key: "employeeCode", required: false },
  { header: "Company", key: "company", required: true },
  { header: "Role", key: "role", required: true },
  { header: "Department", key: "department", required: true },
  { header: "Grade", key: "grade", required: true },
  { header: "Projects", key: "projects", required: false },
];

export const MAX_BULK_ROWS = 5000;
export const MAX_BULK_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// How long a validated-but-not-yet-confirmed upload's parsed rows stay held
// in memory (see employee-bulk-invite.controller.ts's in-process staging
// Map) before /import rejects it as expired and the admin must re-upload.
export const BULK_UPLOAD_STAGING_TTL_MS = 30 * 60 * 1000;

// Message text matches user-stories/010's own Error / Toast Messages table
// wherever that table has an entry; a few (invalidGender, duplicate Employee
// ID, cross-org email/contact conflicts) are implementation-time additions
// not in that table verbatim, added for the same reasons documented in that
// story's Open Questions.
export const BULK_ROW_MESSAGES = {
  invalidEmail: "Invalid Email.",
  duplicateEmail: "Duplicate Email in uploaded file.",
  invalidContactNumber: "Invalid Contact Number.",
  duplicateContactNumber: "Duplicate Contact Number.",
  duplicateEmployeeCode: "Duplicate Employee ID in uploaded file.",
  employeeCodeTooLong: "Employee ID must be at most 30 characters.",
  invalidTitle: "Invalid Title.",
  invalidGender: "Invalid Gender.",
  companyNotFound: "Company not found.",
  roleNotFound: "Role Not Found.",
  departmentNotFound: "Department Not Found.",
  gradeNotFound: "Grade Not Found.",
  projectNotFound: "Project Not Found.",
  dobFuture: "Date of birth cannot be in the future.",
  underage: "Employee must be at least 18 years old.",
  emailTakenByAnotherOrg: "This email is already registered to a different organization.",
  contactNumberTakenByAnotherOrg: "This contact number is already registered to a different organization.",
} as const;
