import { postJson } from "@/utils/apiManager/apiManager";

export function finishCategoryEditSession(id: number): Promise<{ versionCreated: boolean; version: string | null }> {
  return postJson<{ versionCreated: boolean; version: string | null }>(`/categories/${id}/finish-editing`);
}
