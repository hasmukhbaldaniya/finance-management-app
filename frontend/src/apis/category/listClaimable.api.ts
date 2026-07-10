import { apiCall } from "@/utils/apiManager/apiManager";
import type { ClaimableCategory } from "@/types/claim.type";

// A narrower sibling of getCategories — active + enabled categories only,
// each with its own CategoryField[] inline (see backend's
// listClaimableCategories for why: GET /api/categories/:id sits behind
// requireOwner, unreachable by a plain employee filling in a claim).
export function getClaimableCategories(): Promise<{ categories: ClaimableCategory[] }> {
  return apiCall<{ categories: ClaimableCategory[] }>("/categories/claimable", { method: "GET" });
}
