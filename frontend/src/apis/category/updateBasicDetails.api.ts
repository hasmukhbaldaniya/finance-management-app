import { apiCall } from "@/utils/apiManager/apiManager";
import type { CreateCategoryPayload } from "./create.api";

export function updateCategoryBasicDetails(id: number, payload: CreateCategoryPayload): Promise<{ message: string }> {
  return apiCall<{ message: string }>(`/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
