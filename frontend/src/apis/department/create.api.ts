import { postJson } from "@/utils/apiManager/apiManager";
import type { Department } from "@/types/department.type";

export function createDepartment(name: string): Promise<{ department: Department }> {
  return postJson<{ department: Department }>("/departments", { name });
}
