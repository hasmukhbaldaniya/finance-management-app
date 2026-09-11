import { postJson } from "@/utils/apiManager/apiManager";

export function rejectSplitRequest(id: number): Promise<{ message: string }> {
  return postJson(`/split-requests/${id}/reject`);
}
