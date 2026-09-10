import type { PrivilegeKey } from "@/utils/constants/privilege.constant";

export type Role = {
  id: number;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  privileges: PrivilegeKey[];
  membersCount: number;
};

export type RoleMember = {
  id: number;
  name: string;
  email: string;
};

export type RoleSortBy = "name" | "roleType" | "membersCount";
export type { SortDirection } from "./pagination.type";
