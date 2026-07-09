import { apiCall } from "@/utils/apiManager/apiManager";
import type { City } from "@/types/city.type";

export type ListCitiesParams = {
  search?: string;
  countryId?: number;
};

export function getCities(params: ListCitiesParams = {}): Promise<{ cities: City[] }> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.countryId) query.set("countryId", String(params.countryId));

  const queryString = query.toString();
  return apiCall<{ cities: City[] }>(`/cities${queryString ? `?${queryString}` : ""}`, { method: "GET" });
}
