import { apiCall } from "@/utils/apiManager/apiManager";
import type { CategoryPolicy, CategoryStatus } from "@/types/category.type";

export type SaveCategoryProjectPoliciesPayload = {
  enableProjectPolicies: boolean;
  projectPolicies?: CategoryPolicy[];
};

export function saveCategoryProjectPolicies(
  id: number,
  payload: SaveCategoryProjectPoliciesPayload
): Promise<{ message: string; status: CategoryStatus }> {
  return apiCall<{ message: string; status: CategoryStatus }>(`/categories/${id}/project-policies`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
