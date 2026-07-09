import { postJson } from "@/utils/apiManager/apiManager";
import type { CategoryStatus } from "@/types/category.type";

export type CreateCategoryPayload = {
  name: string;
  description: string;
  ziptrripCategoryIds?: string[];
  isDraftSave?: boolean;
};

export function createCategory(payload: CreateCategoryPayload): Promise<{ id: number; status: CategoryStatus }> {
  return postJson<{ id: number; status: CategoryStatus }>("/categories", payload);
}
