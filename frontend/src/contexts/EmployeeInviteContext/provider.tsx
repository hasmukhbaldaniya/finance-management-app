"use client";

import { useMemo, useState, type ReactNode } from "react";
import { EMPTY_BASIC_INFO, EmployeeInviteContext, type BasicInfo, type EmployeeInviteState } from "./context";

export function EmployeeInviteProvider({ children }: { children: ReactNode }) {
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [basicInfo, setBasicInfo] = useState<BasicInfo>(EMPTY_BASIC_INFO);

  const value = useMemo<EmployeeInviteState>(
    () => ({
      employeeId,
      basicInfo,
      setEmployeeId,
      setBasicInfo,
      reset: () => {
        setEmployeeId(null);
        setBasicInfo(EMPTY_BASIC_INFO);
      },
    }),
    [employeeId, basicInfo]
  );

  return <EmployeeInviteContext.Provider value={value}>{children}</EmployeeInviteContext.Provider>;
}
