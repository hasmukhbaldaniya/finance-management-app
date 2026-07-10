import { apiCall } from "@/utils/apiManager/apiManager";
import type { City } from "@/types/city.type";

export type ListCitiesParams = {
  search?: string;
  countryId?: number;
  // Exact-id lookup, e.g. resolving a saved city_list value back to a
  // display name when reopening a draft expense (Claim Management).
  ids?: number[];
};

export function getCities(params: ListCitiesParams = {}): Promise<{ cities: City[] }> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.countryId) query.set("countryId", String(params.countryId));
  if (params.ids && params.ids.length > 0) query.set("ids", params.ids.join(","));

  const queryString = query.toString();
  return apiCall<{ cities: City[] }>(`/cities${queryString ? `?${queryString}` : ""}`, { method: "GET" });
}
