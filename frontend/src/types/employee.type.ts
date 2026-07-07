export type EmployeeTitle = "Mr" | "Mrs" | "Ms";
export type EmployeeGender = "Male" | "Female" | "Other";

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
