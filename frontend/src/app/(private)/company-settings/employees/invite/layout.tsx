import type { ReactNode } from "react";
import { EmployeeInviteProvider } from "@/contexts/EmployeeInviteContext";

export default function EmployeeInviteLayout({ children }: { children: ReactNode }) {
  return <EmployeeInviteProvider>{children}</EmployeeInviteProvider>;
}
