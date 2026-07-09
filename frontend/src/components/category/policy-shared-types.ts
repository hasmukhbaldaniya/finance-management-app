import type { Department } from "@/types/department.type";
import type { EmployeePickerOption } from "@/types/employee.type";
import type { Grade } from "@/types/grade.type";
import type { Project } from "@/types/project.type";

export type PolicyKind = "claim" | "exception" | "project";

export type PolicyPickerOptions = {
  departments: Department[];
  grades: Grade[];
  projects: Project[];
  employees: EmployeePickerOption[];
};

export const OPERATORS: readonly { value: string; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
  { value: "greater_than_or_equal", label: "Greater Than or Equal" },
  { value: "less_than_or_equal", label: "Less Than or Equal" },
];
