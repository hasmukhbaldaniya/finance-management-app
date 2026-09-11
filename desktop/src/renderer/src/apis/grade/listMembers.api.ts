import { apiCall } from "@/utils/apiManager/apiManager";
import type { GradeMember } from "@/types/grade.type";

export function getGradeMembers(id: number): Promise<{ members: GradeMember[] }> {
  return apiCall<{ members: GradeMember[] }>(`/grades/${id}/members`, { method: "GET" });
}
