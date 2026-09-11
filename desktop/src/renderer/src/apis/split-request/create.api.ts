import { postJson } from "@/utils/apiManager/apiManager";
import type { SplitRequestSplitType } from "@/types/split-request.type";

export type CreateSplitRequestMember = { employeeId: number; percentage?: number; amount?: number };

export type CreateSplitRequestPayload = {
  splitType: SplitRequestSplitType;
  members: CreateSplitRequestMember[];
};

export function createSplitRequest(claimId: number, expenseId: number, payload: CreateSplitRequestPayload): Promise<{ id: number }> {
  return postJson(`/claims/${claimId}/expenses/${expenseId}/split-requests`, payload);
}
