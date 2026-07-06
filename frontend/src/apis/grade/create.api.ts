import { postJson } from "@/utils/apiManager/apiManager";
import type { Grade } from "@/types/grade.type";

export function createGrade(name: string): Promise<{ grade: Grade }> {
  return postJson<{ grade: Grade }>("/grades", { name });
}
