export type Grade = {
  id: number;
  name: string;
  isActive: boolean;
  membersCount: number;
};

export type GradeMember = {
  id: number;
  name: string;
  email: string;
};

export type GradeSortBy = "name" | "membersCount";
export type SortDirection = "asc" | "desc";
