import { apiCall } from "@/utils/apiManager/apiManager";
import type { Project } from "@/types/project.type";

export function getProjects(departmentId?: number): Promise<{ projects: Project[] }> {
  const query = departmentId ? `?departmentId=${departmentId}` : "";
  return apiCall<{ projects: Project[] }>(`/projects${query}`, { method: "GET" });
}
