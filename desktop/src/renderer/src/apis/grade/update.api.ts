import { apiCall } from "@/utils/apiManager/apiManager";
import type { Grade } from "@/types/grade.type";

export function updateGrade(id: number, name: string): Promise<{ grade: Grade }> {
  return apiCall<{ grade: Grade }>(`/grades/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}
