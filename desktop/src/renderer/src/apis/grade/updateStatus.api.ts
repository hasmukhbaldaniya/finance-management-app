import { apiCall } from "@/utils/apiManager/apiManager";
import type { Grade } from "@/types/grade.type";

export function updateGradeStatus(id: number, isActive: boolean): Promise<{ grade: Grade }> {
  return apiCall<{ grade: Grade }>(`/grades/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}
