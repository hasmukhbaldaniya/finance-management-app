import { apiCall } from "@/utils/apiManager/apiManager";
import type { Country } from "@/types/country.type";

export function getCountries(): Promise<{ countries: Country[] }> {
  return apiCall<{ countries: Country[] }>("/countries", { method: "GET" });
}
