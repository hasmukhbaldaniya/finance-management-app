import { apiCall } from "@/utils/apiManager/apiManager";
import type { CategoryPolicy } from "@/types/category.type";

export type SaveCategoryPoliciesPayload = {
  claimPolicies: CategoryPolicy[];
  exceptionPolicies: CategoryPolicy[];
  isDraftSave?: boolean;
};

export function saveCategoryPolicies(id: number, payload: SaveCategoryPoliciesPayload): Promise<{ message: string }> {
  return apiCall<{ message: string }>(`/categories/${id}/policies`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
