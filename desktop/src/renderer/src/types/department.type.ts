export type Department = {
  id: number;
  name: string;
  isActive: boolean;
  membersCount: number;
};

export type DepartmentMember = {
  id: number;
  name: string;
  email: string;
};

export type DepartmentSortBy = "name" | "membersCount";
export type { SortDirection } from "./pagination.type";
