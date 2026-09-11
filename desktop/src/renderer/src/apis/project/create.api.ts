import { postJson } from "@/utils/apiManager/apiManager";
import type { Project } from "@/types/project.type";

export function createProject(departmentId: number, name: string): Promise<{ project: Project }> {
  return postJson<{ project: Project }>("/projects", { departmentId, name });
}
