import { apiCall } from "@/utils/apiManager/apiManager";
import type { CategoryField } from "@/types/category.type";

// `id` is a negative, request-scoped sentinel for a field that doesn't exist
// in the database yet — see CategoryFieldDraft's own doc comment.
export type SaveCategoryFieldPayload = CategoryField;

export type SaveCategoryFieldsPayload = {
  fields: SaveCategoryFieldPayload[];
  isDraftSave?: boolean;
};

export function saveCategoryFields(id: number, payload: SaveCategoryFieldsPayload): Promise<{ message: string }> {
  return apiCall<{ message: string }>(`/categories/${id}/fields`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
